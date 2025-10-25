import _ from "lodash";

export class ContentId {
    readonly path: readonly number[];

    constructor(path: readonly number[]) {
        if (path.length === 0) throw new Error("Cannot create ContentId with empty array");
        this.path = [...path];
    }

    get(index: number): number {
        return this.path[index];
    }

    getLeafOrder(): number {
        return this.path[this.path.length - 1];
    }

    get length(): number {
        return this.path.length;
    }

    sibling(relativePosition: number): ContentId {
        const path = _.initial(this.path);
        path.push(this.path[this.path.length - 1] + relativePosition);
        return new ContentId(path);
    }

    parent(): ContentId {
        return new ContentId(_.initial(this.path));
    }

    firstChild(): ContentId {
        return new ContentId([...this.path, 0]);
    }

    static compare(cid1: ContentId, cid2: ContentId): number {
        for (let i = 0; i < Math.min(cid1.path.length, cid2.path.length); i++) {
            if (cid1.path[i] !== cid2.path[i]) return cid1.path[i] - cid2.path[i];
        }
        if (cid1.path.length === cid2.path.length) return 0;
        return NaN;
    }

    static totalOrderCompare(cid1: ContentId, cid2: ContentId): number {
        for (let i = 0; i < Math.min(cid1.path.length, cid2.path.length); i++) {
            if (cid1.path[i] !== cid2.path[i]) return cid1.path[i] - cid2.path[i];
        }
        return cid1.path.length - cid2.path.length;
    }
}

export class Partition {
    constructor(
        private readonly offset: ContentId,
        readonly size: number = 1,
    ) {
        if (size <= 0) throw new Error("Size must be positive");
    }

    get first(): ContentId {
        return this.offset;
    }

    get last(): ContentId {
        return this.offset.sibling(this.size - 1);
    }

    contains(contentId: ContentId): boolean {
        return (
            ContentId.compare(contentId, this.first) >= 0 &&
            ContentId.compare(contentId, this.last) <= 0
        );
    }

    static compare(p1: Partition, p2: Partition): number {
        if (_.isEqual(p1.offset, p2.offset) && p1.size === p2.size) return 0;
        if (ContentId.compare(p1.last, p2.first) < 0) return -1;
        if (ContentId.compare(p1.first, p2.last) > 0) return 1;
        return NaN;
    }

    static totalOrderCompare(p1: Partition, p2: Partition): number {
        return ContentId.totalOrderCompare(p1.offset, p2.offset) || p1.size - p2.size;
    }
}

export interface Translation {
    partition: Partition;
    content: string;
}

export class Translator {
    original: XMLDocument;
    translations: Translation[] = [];

    constructor(original: string) {
        this.original = new DOMParser().parseFromString(original, "text/xml");
    }

    getOriginalNode(contentId: ContentId): Node {
        let node: Node = this.original;
        for (let index = 0; index < contentId.length; index++) {
            node = node.childNodes.item(contentId.get(index));
        }
        return node;
    }

    findTranslationIndices(contentId: ContentId): number[] {
        const result = [];
        for (let index = 0; index < this.translations.length; index++) {
            const { partition } = this.translations[index];
            if (partition.contains(contentId)) {
                result.push(index);
            }
        }
        return result;
    }

    registerTranslation(partition: Partition, content: string) {
        const translation: Translation = { partition, content };
        const index = binarySearchIndex(this.translations, translation, (a, b) =>
            Partition.totalOrderCompare(a.partition, b.partition),
        );
        this.translations.splice(index, 0, translation);
    }

    /** invariant: parameter `translationIndices` must be sorted */
    hasOverlappingTranslations(translationIndices?: number[]): boolean {
        const indices = translationIndices ?? _.range(this.translations.length);
        for (let i = 0; i < indices.length - 1; i++) {
            const a = this.translations[indices[i]];
            const b = this.translations[indices[i + 1]];
            const result = Partition.compare(a.partition, b.partition);
            if (Number.isNaN(result) || result >= 0) return true;
        }
        return false;
    }

    render(translationIndices: number[]) {
        const indices = translationIndices
            ? translationIndices.sort()
            : _.range(this.translations.length);

        if (this.hasOverlappingTranslations(indices)) {
            throw new Error("Overlapping translations");
        }

        let result = "";

        let node: Node | null = this.original.firstChild;
        if (!node) return "";
        let contentId = new ContentId([0]);

        const translations = indices.map((index) => this.translations[index]);
        let index = 0;

        while (
            node.parentNode &&
            !(
                node.parentNode === this.original &&
                !node.nextSibling &&
                contentId.getLeafOrder() >= node.parentNode.childNodes.length
            )
        ) {
            if (contentId.getLeafOrder() >= node.parentNode.childNodes.length) {
                if (node.parentNode instanceof Element && node.parentNode.hasChildNodes()) {
                    result += `</${node.parentNode.tagName}>`;
                }
                contentId = contentId.parent().sibling(1);
                node = node.parentNode.nextSibling ?? node.parentNode;
            } else if (translations.at(index)?.partition.contains(contentId)) {
                result += translations[index].content;
                let size = translations[index++].partition.size;
                contentId = contentId.sibling(size);
                while (node.nextSibling && size--) node = node.nextSibling;
            } else {
                // TODO: implement attributes handling
                if (node instanceof Element) {
                    result += `<${node.tagName}`;
                    for (const attr of node.attributes) {
                        result += ` ${attr.name}="${attr.value}"`;
                    }
                    if (node.firstChild) {
                        result += ">";
                        contentId = contentId.firstChild();
                        node = node.firstChild;
                    } else {
                        result += "/>";
                        contentId = contentId.sibling(1);
                        node = node.nextSibling ?? node;
                    }
                } else if (node instanceof Text) {
                    result += node.textContent;
                    contentId = contentId.sibling(1);
                    node = node.nextSibling ?? node;
                } else if (node instanceof DocumentType) {
                    result += `<!DOCTYPE ${node.name} PUBLIC "${node.publicId}" "${node.systemId}">`;
                    contentId = contentId.sibling(1);
                    node = node.nextSibling ?? node;
                } else {
                    contentId = contentId.sibling(1);
                    node = node.nextSibling ?? node;
                }
            }
        }
        return result;
    }
}

function binarySearchIndex<T>(array: T[], target: T, compare: (a: T, b: T) => number): number {
    let left = 0;
    let right = array.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const result = compare(array[mid], target);
        if (result < 0) left = mid + 1;
        else if (result > 0) right = mid - 1;
        else return mid;
    }
    return left;
}
