import { v4 as uuidv4 } from "uuid";
import { NodeId, Partition, type Translation } from "$lib/core/common";
import { type AnyNode, Document, Element, parseDocument } from "$lib/utils/virtual-dom";

export default class TranslationComposer {
	private readonly original: string;
	private readonly originalDom: Document;
	private readonly translations: Record<string, Translation> = {};

	constructor(original: string) {
		this.original = original;
		this.originalDom = parseDocument(original, {
			xmlMode: true,
			withStartIndices: true,
			withEndIndices: true,
		});
	}

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

	addTranslation(partition: Partition, content: string): string {
		const id = uuidv4();
		this.translations[id] = { id, partition, content };
		return id;
	}

	removeTranslation(translationId: string): void {
		delete this.translations[translationId];
	}

	updateTranslation(translationId: string, content: string): void {
		const translation = this.translations[translationId];
		if (!translation) throw new Error(`Translation not found: ${translationId}`);
		translation.content = content;
	}

	listTranslations(): Translation[] {
		return Object.values(this.translations);
	}

	checkOverlaps(translationIds: string[]): boolean {
		const partitions = translationIds.map((id) => this.translations[id].partition);
		return Partition.checkOverlap(partitions);
	}

	render(translationIds: string[]) {
		const translations = translationIds.map((id) => this.translations[id]);
		translations.sort((a, b) => Partition.compare(a.partition, b.partition));

		if (Partition.checkOverlap(translations.map((tr) => tr.partition))) {
			throw new Error("Overlapping translations");
		}

		let result = "";

		if (!this.originalDom.firstChild) return result;
		let node: AnyNode = this.originalDom.firstChild;
		let nodeId = new NodeId([0]);

		let index = 0;

		while (node.parentNode) {
			if (nodeId.leafOrder >= node.parentNode.childNodes.length) {
				result += this.original.slice(node.endIndex! + 1, node.parentNode.endIndex! + 1);
				nodeId = nodeId.parent.sibling(1);
				node = node.parentNode.nextSibling ?? node.parentNode;
			} else if (translations.at(index)?.partition.contains(nodeId)) {
				result += translations[index].content;
				let size = translations[index++].partition.size;
				nodeId = nodeId.sibling(size);
				while (node.nextSibling && size--) node = node.nextSibling;
			} else if (node instanceof Element && node.firstChild) {
				result += this.original.slice(node.startIndex!, node.firstChild.startIndex!);
				nodeId = nodeId.firstChild;
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
