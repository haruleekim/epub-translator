import _ from "lodash";
import {
	type AnyNode,
	Document,
	Element,
	parseDocument,
	parseDocumentAsync,
} from "$lib/utils/virtual-dom";

export class NodeId {
	readonly path: readonly number[];

	constructor(path: readonly number[]) {
		this.path = [...path];
	}

	static parse(text: string): NodeId {
		if (text === "") return NodeId.root();
		const parts = text.split("/");
		return new NodeId(parts.map(Number));
	}

	toString(): string {
		return this.path.join("/");
	}

	static root(): NodeId {
		return new NodeId([]);
	}

	get length() {
		return this.path.length;
	}

	get leafOrder(): number | null {
		if (!this.path.length) return null;
		return this.path[this.path.length - 1];
	}

	sibling(relativePosition: number): NodeId | null {
		if (!this.path.length) return null;
		const path = this.path.slice(0, -1);
		path.push(this.path[this.path.length - 1] + relativePosition);
		return new NodeId(path);
	}

	get parent(): NodeId | null {
		return this.path.length ? new NodeId(this.path.slice(0, -1)) : null;
	}

	get firstChild(): NodeId {
		return new NodeId([...this.path, 0]);
	}

	nthChild(n: number): NodeId {
		if (n < 0) throw new Error("n must be non-negative");
		return new NodeId([...this.path, n]);
	}

	contains(other: NodeId): boolean {
		if (this.path.length > other.path.length) return false;
		for (let i = 0; i < this.path.length; i++) {
			if (this.path[i] !== other.path[i]) return false;
		}
		return true;
	}

	relativeFrom(ancestor: NodeId): NodeId {
		if (!ancestor.contains(this)) {
			throw new Error("The specified NodeId is not an ancestor");
		}
		return new NodeId(this.path.slice(ancestor.path.length));
	}

	static commonAncestor(cid1: NodeId, cid2: NodeId): NodeId {
		const path = [];
		for (let i = 0; i < Math.min(cid1.path.length, cid2.path.length); i++) {
			if (cid1.path[i] !== cid2.path[i]) break;
			path.push(cid1.path[i]);
		}
		return new NodeId(path);
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
		if (offset.length === 0) throw new Error("Offset must be non-root");
		if (size <= 0) throw new Error("Size must be positive");
	}

	toString(): string {
		return `${this.offset.toString()}-${this.last.leafOrder}`;
	}

	static parse(str: string): Partition {
		const [offsetStr, lastLeafOrderStr] = str.split("-");
		const offset = NodeId.parse(offsetStr);
		const lastLeafOrder = parseInt(lastLeafOrderStr);
		return new Partition(offset, lastLeafOrder - offset.leafOrder! + 1);
	}

	get first(): NodeId {
		return this.offset;
	}

	get last(): NodeId {
		return this.offset.sibling(this.size - 1)!;
	}

	contains(id: NodeId): boolean {
		let s = NodeId.compare(this.first, id);
		let e = NodeId.compare(this.last, id);
		if (Number.isNaN(s)) s = this.first.path.length - id.path.length;
		if (Number.isNaN(e)) e = id.path.length - this.last.path.length;
		return s <= 0 && 0 <= e;
	}

	covers(other: Partition): boolean {
		return this.contains(other.first) && this.contains(other.last);
	}

	static covering(start: NodeId, end: NodeId): Partition {
		const commonAncestor = NodeId.commonAncestor(start, end);
		const ordering = NodeId.compare(start, end);
		if (ordering) {
			let [s, e] = ordering < 0 ? [start, end] : [end, start];
			while (s.length > commonAncestor.length + 1) s = s.parent!;
			while (e.length > commonAncestor.length + 1) e = e.parent!;
			let [offset, size] = [s, 1];
			while (NodeId.compare(s, e) && size++) s = s.sibling(1)!;
			return new Partition(offset, size);
		} else {
			return new Partition(commonAncestor);
		}
	}

	static checkDisjoint(partitions: Partition[], skipSort: boolean = false): boolean {
		if (!skipSort) partitions = partitions.toSorted(Partition.totalOrderCompare);
		for (let i = 0; i < partitions.length - 1; i++) {
			const a = partitions[i];
			const b = partitions[i + 1];
			const result = Partition.compare(a, b);
			if (Number.isNaN(result) || result >= 0) return false;
		}
		return true;
	}

	static compare(p1: Partition, p2: Partition): number {
		if (_.isEqual(p1.offset, p2.offset) && p1.size === p2.size) return 0;
		if (NodeId.compare(p1.last, p2.first) < 0) return -1;
		if (NodeId.compare(p1.first, p2.last) > 0) return 1;
		return NaN;
	}

	static totalOrderCompare(p1: Partition, p2: Partition): number {
		return NodeId.totalOrderCompare(p1.offset, p2.offset) || p2.size - p1.size;
	}
}

export class Dom {
	private constructor(
		private text: string,
		private root: Document,
	) {}

	static load(text: string) {
		const root = parseDocument(text, {
			xmlMode: true,
			withStartIndices: true,
			withEndIndices: true,
		});
		return new Dom(text, root);
	}

	static async loadAsync(text: string) {
		const root = await parseDocumentAsync(text, {
			xmlMode: true,
			withStartIndices: true,
			withEndIndices: true,
		});
		return new Dom(text, root);
	}

	get document(): Readonly<Document> {
		return this.root;
	}

	getNode(nodeId: NodeId): AnyNode | null {
		let node: AnyNode | null = this.root;
		for (let index = 0; index < nodeId.path.length; index++) {
			if (node instanceof Element || node instanceof Document) {
				node = node.children.at(nodeId.path[index]) ?? null;
			}
		}
		return node;
	}

	extractContent(arg: NodeId | Partition): string {
		if (arg instanceof NodeId) {
			const node = this.getNode(arg);
			if (!node) throw new Error("Node not found");
			return this.text.slice(node.startIndex!, node.endIndex! + 1);
		} else if (arg instanceof Partition) {
			const first = this.getNode(arg.first);
			const last = this.getNode(arg.last);
			if (!first || !last) throw new Error("Node not found");
			return this.text.slice(first.startIndex!, last.endIndex! + 1);
		} else {
			throw new Error("Invalid argument");
		}
	}

	substituteAll(substitutions: Substitution[]): string {
		substitutions = substitutions.toSorted((a, b) =>
			Partition.totalOrderCompare(a.partition, b.partition),
		);

		const partitions = substitutions.map((tr) => tr.partition);
		if (!Partition.checkDisjoint(partitions, true)) {
			throw new Error("Overlapping partitions");
		}

		let result = "";

		if (!this.root.firstChild) return result;
		let node: AnyNode = this.root.firstChild;
		let nodeId: NodeId | null = new NodeId([0]);

		let index = 0;

		while (nodeId && node.parent) {
			if ((nodeId.leafOrder ?? 0) >= node.parent.children.length) {
				result += this.text.slice(node.endIndex! + 1, node.parent.endIndex! + 1);
				nodeId = nodeId.parent?.sibling(1) ?? null;
				node = node.parent.next ?? node.parent;
			} else if (substitutions.at(index)?.partition.contains(nodeId)) {
				result += substitutions[index].content;
				let size = substitutions[index++].partition.size;
				nodeId = nodeId.sibling(size);
				while (node.next && size--) node = node.next;
			} else if ("children" in node && node.firstChild) {
				result += this.text.slice(node.startIndex!, node.firstChild.startIndex!);
				nodeId = nodeId.firstChild;
				node = node.firstChild;
			} else {
				result += this.text.slice(node.startIndex!, node.endIndex! + 1);
				nodeId = nodeId.sibling(1);
				node = node.next ?? node;
			}
		}

		return result;
	}

	#substituteSelf(subpartition: Partition, dom: Dom): void {
		const parent = this.getNode(subpartition.first.parent!);
		const startNode = this.getNode(subpartition.first);
		const endNode = this.getNode(subpartition.last);
		if (startNode == null || endNode == null || parent == null || !("children" in parent)) {
			throw new Error("Node not found or invalid");
		}
		const [start, end] = [startNode.startIndex!, endNode.endIndex! + 1];
		for (const { node, close } of dom) {
			if (close) continue;
			node.startIndex! += start;
			node.endIndex! += start;
		}
		const diff = dom.text.length - (end - start);
		let applyDiff = false;
		for (const { node, open, close } of this) {
			if (!applyDiff) {
				if (node === endNode) applyDiff = true;
				continue;
			}
			if (open) node.startIndex! += diff;
			if (close) node.endIndex! += diff;
		}
		parent.children.splice(
			subpartition.first.leafOrder!,
			subpartition.size,
			...dom.root.children,
		);
		this.text = this.text.slice(0, start) + dom.text + this.text.slice(end);
	}

	async mergeSubstitutions(substitutions: Substitution[]): Promise<Substitution> {
		if (substitutions.length === 0) throw new Error("No substitutions to merge");

		substitutions = substitutions.toSorted(
			(a, b) => -Partition.totalOrderCompare(a.partition, b.partition),
		);

		const stack: { partition: Partition; dom: Dom }[] = [];
		const doms = substitutions.map((s) => Dom.loadAsync(s.content));
		for (let i = 0; i < substitutions.length; i++) {
			const dom = await doms[i];
			const { partition } = substitutions[i];
			while (stack.length && partition.covers(stack[stack.length - 1].partition)) {
				const top = stack.pop()!;
				if (Partition.compare(top.partition, partition) === 0) {
					throw new Error("Identical partitions");
				}
				const path = top.partition.first.path.slice(partition.first.parent!.length);
				path.splice(0, 1, path[0] - partition.first.leafOrder!);
				const relative = new Partition(new NodeId(path), top.partition.size);
				dom.#substituteSelf(relative, top.dom);
			}
			if (stack.length) {
				const top = stack[stack.length - 1];
				if (NodeId.compare(top.partition.first, partition.last) <= 0) {
					throw new Error("Overlapping partitions");
				}
			}
			stack.push({ partition, dom });
		}

		const partition = Partition.covering(
			stack[stack.length - 1].partition.first,
			stack[0].partition.last,
		);
		const [startNode, endNode] = [this.getNode(partition.first), this.getNode(partition.last)];
		if (!startNode || !endNode) throw new Error("Invalid structure");
		const [start, end] = [startNode.startIndex!, endNode.endIndex! + 1];

		let content = this.text.slice(start, end);
		for (const { partition, dom } of stack) {
			const [sn, en] = [this.getNode(partition.first), this.getNode(partition.last)];
			if (!sn || !en) throw new Error("Invalid structure");
			const [s, e] = [sn.startIndex! - start, en.endIndex! + 1 - start];
			content = content.slice(0, s) + dom.text + content.slice(e);
		}

		return { partition, content };
	}

	*[Symbol.iterator](): Generator<DomTraversal, Document> {
		yield { nodeId: NodeId.root(), node: this.root, open: true, close: false };

		if (!this.root.firstChild) {
			yield { nodeId: NodeId.root(), node: this.root, open: false, close: true };
			return this.root;
		}

		let node = this.root.firstChild;
		let nodeId: NodeId | null = new NodeId([0]);

		while (nodeId && node.parent) {
			if ((nodeId.leafOrder ?? 0) >= node.parent.children.length) {
				yield { nodeId: nodeId.parent!, node: node.parent, open: false, close: true };
				node = node.parent.next ?? node.parent;
				nodeId = nodeId.parent?.sibling(1) ?? null;
				continue;
			}

			if ("children" in node && node.firstChild) {
				yield { nodeId, node, open: true, close: false };
				node = node.firstChild;
				nodeId = nodeId.firstChild;
			} else {
				yield { nodeId, node, open: true, close: false };
				yield { nodeId, node, open: false, close: true };
				node = node.next ?? node;
				nodeId = nodeId.sibling(1);
			}
		}

		return this.root;
	}

	tokenize(): Token[] {
		const tokens: Token[] = [];
		for (const entry of this) {
			const { node, open } = entry;
			let start: number, end: number;
			if ("children" in node && node.children.length > 0) {
				if (open) {
					start = node.startIndex!;
					end = node.firstChild!.startIndex!;
				} else {
					start = node.lastChild!.endIndex! + 1;
					end = node.endIndex! + 1;
				}
			} else if (open) {
				start = node.startIndex!;
				end = node.endIndex! + 1;
			} else {
				continue;
			}
			tokens.push({ ...entry, content: this.text.slice(start, end) });
		}
		return tokens;
	}
}

export interface Substitution {
	partition: Partition;
	content: string;
}

export type DomTraversal = { nodeId: NodeId; node: AnyNode } & (
	| { open: true; close: false }
	| { open: false; close: true }
);

export type Token = DomTraversal & { content: string };
