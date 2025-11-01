import _ from "lodash";
import { type AnyNode, Document, Element, parseDocument } from "@/utils/virtual-dom";

export class NodeId {
    readonly path: readonly number[];

    constructor(path: readonly number[]) {
        this.path = [...path];
    }

    static parse(text: string): NodeId {
        if (text === "") return new NodeId([]);
        const parts = text.split("/");
        return new NodeId(parts.map(Number));
    }

    toString(): string {
        return this.path.join("/");
    }

    leafOrder(): number {
        return this.path[this.path.length - 1];
    }

    sibling(relativePosition: number): NodeId {
        const path = _.initial(this.path);
        path.push(this.path[this.path.length - 1] + relativePosition);
        return new NodeId(path);
    }

    parent(): NodeId {
        return new NodeId(_.initial(this.path));
    }

    firstChild(): NodeId {
        return new NodeId([...this.path, 0]);
    }

    static compare(cid1: NodeId, cid2: NodeId): number {
        for (let i = 0; i < Math.min(cid1.path.length, cid2.path.length); i++) {
            if (cid1.path[i] !== cid2.path[i]) return cid1.path[i] - cid2.path[i];
        }
        if (cid1.path.length === cid2.path.length) return 0;
        return NaN;
    }

    static totalOrderCompare(cid1: NodeId, cid2: NodeId): number {
        for (let i = 0; i < Math.min(cid1.path.length, cid2.path.length); i++) {
            if (cid1.path[i] !== cid2.path[i]) return cid1.path[i] - cid2.path[i];
        }
        return cid1.path.length - cid2.path.length;
    }
}

export class Partition {
    constructor(
        private readonly offset: NodeId,
        readonly size: number = 1,
    ) {
        if (size <= 0) throw new Error("Size must be positive");
    }

    get first(): NodeId {
        return this.offset;
    }

    get last(): NodeId {
        return this.offset.sibling(this.size - 1);
    }

    contains(id: NodeId): boolean {
        return NodeId.compare(id, this.first) >= 0 && NodeId.compare(id, this.last) <= 0;
    }

    static compare(p1: Partition, p2: Partition): number {
        if (_.isEqual(p1.offset, p2.offset) && p1.size === p2.size) return 0;
        if (NodeId.compare(p1.last, p2.first) < 0) return -1;
        if (NodeId.compare(p1.first, p2.last) > 0) return 1;
        return NaN;
    }

    static totalOrderCompare(p1: Partition, p2: Partition): number {
        return NodeId.totalOrderCompare(p1.offset, p2.offset) || p1.size - p2.size;
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

    getOriginalContent(id: NodeId): string {
        const { startIndex, endIndex } = this.#getOriginalNode(id);
        return this.original.slice(startIndex!, endIndex! + 1);
    }

    #getOriginalNode(id: NodeId): AnyNode {
        let node: AnyNode = this.originalDom;
        for (let index = 0; index < id.path.length; index++) {
            if (node instanceof Element || node instanceof Document) {
                node = node.childNodes[id.path[index]];
            }
        }
        return node;
    }

    findTranslationIndices(id: NodeId): number[] {
        const result = [];
        for (let index = 0; index < this.translations.length; index++) {
            const { partition } = this.translations[index];
            if (partition.contains(id)) {
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

    hasOverlappingTranslations(translationIndices?: number[]): boolean {
        const indices = translationIndices
            ? [...translationIndices].sort()
            : _.range(this.translations.length);
        return this.#hasOverlappingTranslations(indices);
    }

    #hasOverlappingTranslations(translationIndices: number[]): boolean {
        for (let i = 0; i < translationIndices.length - 1; i++) {
            const a = this.translations[translationIndices[i]];
            const b = this.translations[translationIndices[i + 1]];
            const result = Partition.compare(a.partition, b.partition);
            if (Number.isNaN(result) || result >= 0) return true;
        }
        return false;
    }

    render(translationIndices: number[]) {
        const indices = translationIndices
            ? [...translationIndices].sort()
            : _.range(this.translations.length);

        if (this.#hasOverlappingTranslations(indices)) {
            throw new Error("Overlapping translations");
        }

        let result = "";

        if (!this.originalDom.firstChild) return result;
        let node: AnyNode = this.originalDom.firstChild;
        let id = new NodeId([0]);

        const translations = indices.map((index) => this.translations[index]);
        let index = 0;

        while (node.parentNode) {
            if (id.leafOrder() >= node.parentNode.childNodes.length) {
                result += this.original.slice(node.endIndex! + 1, node.parentNode.endIndex! + 1);
                id = id.parent().sibling(1);
                node = node.parentNode.nextSibling ?? node.parentNode;
            } else if (translations.at(index)?.partition.contains(id)) {
                result += translations[index].content;
                let size = translations[index++].partition.size;
                id = id.sibling(size);
                while (node.nextSibling && size--) node = node.nextSibling;
            } else if (node instanceof Element && node.firstChild) {
                result += this.original.slice(node.startIndex!, node.firstChild.startIndex!);
                id = id.firstChild();
                node = node.firstChild;
            } else {
                result += this.original.slice(node.startIndex!, node.endIndex! + 1);
                id = id.sibling(1);
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
