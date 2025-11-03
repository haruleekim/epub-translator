import _ from "lodash";
import { v4 as uuidv4 } from "uuid";
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
        if (this.path.length) path.push(this.path[this.path.length - 1] + relativePosition);
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

    toString(): string {
        return `${this.offset.toString()}-${this.last.leafOrder()}`;
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

export class TranslationComposer {
    private readonly original: string;
    private readonly originalDom: Document;
    readonly translations: Record<string, Translation> = {};

    constructor(original: string) {
        this.original = original;
        this.originalDom = parseDocument(original, {
            xmlMode: true,
            withStartIndices: true,
            withEndIndices: true,
        });
    }

    getOriginalContent(nodeId: NodeId): string;
    getOriginalContent(partition: Partition): string;
    getOriginalContent(arg: NodeId | Partition): string {
        if (arg instanceof NodeId) {
            const { startIndex, endIndex } = this.#getOriginalNode(arg);
            return this.original.slice(startIndex!, endIndex! + 1);
        } else if (arg instanceof Partition) {
            const { startIndex } = this.#getOriginalNode(arg.first);
            const { endIndex } = this.#getOriginalNode(arg.last);
            return this.original.slice(startIndex!, endIndex! + 1);
        } else {
            throw new Error("Invalid argument");
        }
    }

    #getOriginalNode(nodeId: NodeId): AnyNode {
        let node: AnyNode = this.originalDom;
        for (let index = 0; index < nodeId.path.length; index++) {
            if (node instanceof Element || node instanceof Document) {
                node = node.childNodes[nodeId.path[index]];
            }
        }
        return node;
    }

    findTranslationIds(nodeId: NodeId): string[] {
        const result = [];
        for (const translationId in this.translations) {
            const { partition } = this.translations[translationId];
            if (partition.contains(nodeId)) {
                result.push(translationId);
            }
        }
        return result;
    }

    registerTranslation(partition: Partition, content: string): string {
        const translationId = uuidv4();
        const translation: Translation = { partition, content };
        this.translations[translationId] = translation;
        return translationId;
    }

    hasOverlappingTranslations(translationIds?: string[]): boolean {
        const translations = translationIds
            ? translationIds.map((id) => this.translations[id])
            : Object.values(this.translations);
        translations.sort((a, b) => Partition.compare(a.partition, b.partition));
        return this.#hasOverlappingTranslations(translations);
    }

    #hasOverlappingTranslations(translations: Translation[]): boolean {
        for (let i = 0; i < translations.length - 1; i++) {
            const a = translations[i];
            const b = translations[i + 1];
            const result = Partition.compare(a.partition, b.partition);
            if (Number.isNaN(result) || result >= 0) return true;
        }
        return false;
    }

    render(translationIds: string[]) {
        const translations = translationIds
            ? translationIds.map((id) => this.translations[id])
            : Object.values(this.translations);
        translations.sort((a, b) => Partition.compare(a.partition, b.partition));

        if (this.#hasOverlappingTranslations(translations)) {
            throw new Error("Overlapping translations");
        }

        let result = "";

        if (!this.originalDom.firstChild) return result;
        let node: AnyNode = this.originalDom.firstChild;
        let nodeId = new NodeId([0]);

        let index = 0;

        while (node.parentNode) {
            if (nodeId.leafOrder() >= node.parentNode.childNodes.length) {
                result += this.original.slice(node.endIndex! + 1, node.parentNode.endIndex! + 1);
                nodeId = nodeId.parent().sibling(1);
                node = node.parentNode.nextSibling ?? node.parentNode;
            } else if (translations.at(index)?.partition.contains(nodeId)) {
                result += translations[index].content;
                let size = translations[index++].partition.size;
                nodeId = nodeId.sibling(size);
                while (node.nextSibling && size--) node = node.nextSibling;
            } else if (node instanceof Element && node.firstChild) {
                result += this.original.slice(node.startIndex!, node.firstChild.startIndex!);
                nodeId = nodeId.firstChild();
                node = node.firstChild;
            } else {
                result += this.original.slice(node.startIndex!, node.endIndex! + 1);
                nodeId = nodeId.sibling(1);
                node = node.nextSibling ?? node;
            }
        }

        return result;
    }
}
