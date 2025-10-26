import { type AnyNode, Document, Element } from "domhandler";
import { parseDocument } from "htmlparser2";
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
    private readonly original: string;
    private readonly originalDom: Document;
    private translations: Translation[] = [];

    constructor(original: string) {
        this.original = original;
        this.originalDom = parseDocument(original, {
            xmlMode: true,
            withStartIndices: true,
            withEndIndices: true,
        });
    }

    getOriginalNode(contentId: ContentId): AnyNode {
        let node: AnyNode = this.originalDom;
        for (let index = 0; index < contentId.length; index++) {
            if (node instanceof Element || node instanceof Document) {
                node = node.childNodes[contentId.get(index)];
            }
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

    /** invariant: parameter `translationIndices` must be sorted before calling this function. */
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

        let node: AnyNode | null = this.originalDom.firstChild;
        if (!node) return "";
        let contentId = new ContentId([0]);

        const translations = indices.map((index) => this.translations[index]);
        let index = 0;

        while (
            node.parentNode &&
            !(
                node.parentNode === this.originalDom &&
                !node.nextSibling &&
                contentId.getLeafOrder() >= node.parentNode.childNodes.length
            )
        ) {
            if (contentId.getLeafOrder() >= node.parentNode.childNodes.length) {
                if (node.parentNode instanceof Element && node.parentNode.childNodes.length > 0) {
                    result += this.original.slice(
                        node.endIndex! + 1,
                        node.parentNode.endIndex! + 1,
                    );
                }
                contentId = contentId.parent().sibling(1);
                node = node.parentNode.nextSibling ?? node.parentNode;
            } else if (translations.at(index)?.partition.contains(contentId)) {
                result += translations[index].content;
                let size = translations[index++].partition.size;
                contentId = contentId.sibling(size);
                while (node.nextSibling && size--) node = node.nextSibling;
            } else if (node instanceof Element && node.childNodes.length > 0) {
                result += this.original.slice(node.startIndex!, node.firstChild!.startIndex!);
                contentId = contentId.firstChild();
                node = node.firstChild!;
            } else {
                result += this.original.slice(node.startIndex!, node.endIndex! + 1);
                contentId = contentId.sibling(1);
                node = node.nextSibling ?? node;
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
