import { expect, suite, test } from "vitest";
import { NodeId, Partition, Dom, type DomTraversal } from "$lib/core/dom";

const nid = NodeId.parse;
const pid = Partition.parse;

suite("NodeId", () => {
	test("parse", () => {
		expect(NodeId.parse("")).toStrictEqual(new NodeId([]));
		expect(NodeId.parse("1")).toStrictEqual(new NodeId([1]));
		expect(NodeId.parse("1/2")).toStrictEqual(new NodeId([1, 2]));
		expect(NodeId.parse("1/2/3")).toStrictEqual(new NodeId([1, 2, 3]));
	});

	test("toString", () => {
		expect(new NodeId([]).toString()).toBe("");
		expect(new NodeId([1]).toString()).toBe("1");
		expect(new NodeId([1, 2]).toString()).toBe("1/2");
		expect(new NodeId([1, 2, 3]).toString()).toBe("1/2/3");
	});

	test("root", () => {
		expect(NodeId.root()).toStrictEqual(new NodeId([]));
		expect(NodeId.root()).toStrictEqual(nid(""));
	});

	test("parent", () => {
		expect(NodeId.root().parent).toStrictEqual(null);
		expect(nid("1").parent).toStrictEqual(NodeId.root());
		expect(nid("1/2").parent).toStrictEqual(nid("1"));
	});

	test("sibling", () => {
		expect(NodeId.root().sibling(0)).toStrictEqual(null);
		expect(NodeId.root().sibling(1)).toStrictEqual(null);
		expect(NodeId.root().sibling(-2)).toStrictEqual(null);

		expect(nid("1/2").sibling(0)).toStrictEqual(nid("1/2"));
		expect(nid("1/2").sibling(1)).toStrictEqual(nid("1/3"));
		expect(nid("1/2").sibling(-2)).toStrictEqual(nid("1/0"));
	});

	test("commonAncestors", () => {
		let result = NodeId.commonAncestor(nid("1/2/3"), nid("1/2/4"));
		expect(result).toStrictEqual(nid("1/2"));

		result = NodeId.commonAncestor(nid("1/2/3"), nid("1/2"));
		expect(result).toStrictEqual(nid("1/2"));

		result = NodeId.commonAncestor(nid("1/2/3"), nid("1"));
		expect(result).toStrictEqual(nid("1"));

		result = NodeId.commonAncestor(nid("1/2/3"), nid("2"));
		expect(result).toStrictEqual(NodeId.root());
	});

	test("relativeFrom", () => {
		expect(nid("").relativeFrom(nid(""))).toEqual(nid(""));
		expect(() => nid("").relativeFrom(nid("1/2/3"))).toThrow();
		expect(nid("1/2/3").relativeFrom(nid(""))).toEqual(nid("1/2/3"));
		expect(nid("1/2/3").relativeFrom(nid("1"))).toEqual(nid("2/3"));
		expect(nid("1/2/3").relativeFrom(nid("1/2"))).toEqual(nid("3"));
		expect(nid("1/2/3").relativeFrom(nid("1/2/3"))).toEqual(nid(""));
		expect(() => nid("1/2/3").relativeFrom(nid("1/2/3/4"))).toThrow();
	});

	test("compare", () => {
		let result = NodeId.compare(nid("1/1"), nid("1/1"));
		expect(result).toBe(0);

		result = NodeId.compare(nid("1/1"), nid("1/2"));
		expect(result).toBeLessThan(0);

		result = NodeId.compare(nid("1/1"), nid("1/0"));
		expect(result).toBeGreaterThan(0);

		result = NodeId.compare(nid("1/1"), nid("1/1/1"));
		expect(result).toBeNaN();

		result = NodeId.compare(nid("1/1/1"), nid("1/1"));
		expect(result).toBeNaN();
	});

	test("totalOrderCompare", () => {
		let result = NodeId.totalOrderCompare(nid("1/1"), nid("1/1"));
		expect(result).toBe(0);

		result = NodeId.totalOrderCompare(nid("1/1"), nid("1/2"));
		expect(result).toBeLessThan(0);

		result = NodeId.totalOrderCompare(nid("1/1"), nid("1/0"));
		expect(result).toBeGreaterThan(0);

		result = NodeId.totalOrderCompare(nid("1/1"), nid("1/1/1"));
		expect(result).toBeLessThan(0);

		result = NodeId.totalOrderCompare(nid("1/1/1"), nid("1/1"));
		expect(result).toBeGreaterThan(0);
	});
});

suite("Partition", () => {
	test("parse", () => {
		expect(Partition.parse("1/2-2")).toStrictEqual(new Partition(nid("1/2")));
		expect(Partition.parse("1/2-2")).toStrictEqual(new Partition(nid("1/2"), 1));
		expect(Partition.parse("1/2-3")).toStrictEqual(new Partition(nid("1/2"), 2));
	});

	test("toString", () => {
		expect(new Partition(nid("1/2")).toString()).toBe("1/2-2");
		expect(new Partition(nid("1/2"), 1).toString()).toBe("1/2-2");
		expect(new Partition(nid("1/2"), 2).toString()).toBe("1/2-3");
	});

	test("contains", () => {
		let partition = pid("1/2-2");
		expect(partition.contains(nid("1/2"))).toBe(true);
		expect(partition.contains(nid("1/3"))).toBe(false);
		expect(partition.contains(nid("1/2/3"))).toBe(true);

		partition = pid("1/2-3");
		expect(partition.contains(nid("1/2"))).toBe(true);
		expect(partition.contains(nid("1/3"))).toBe(true);
		expect(partition.contains(nid("1/4"))).toBe(false);
		expect(partition.contains(nid("1/2/3"))).toBe(true);
	});

	test("compare", () => {
		let result = Partition.compare(pid("1/2-2"), pid("1/2-2"));
		expect(result).toBe(0);

		result = Partition.compare(pid("1/2-2"), pid("1/3-3"));
		expect(result).toBeLessThan(0);

		result = Partition.compare(pid("1/2-2"), pid("1/1-1"));
		expect(result).toBeGreaterThan(0);

		result = Partition.compare(pid("1/2-2"), pid("1/0-1"));
		expect(result).toBeGreaterThan(0);

		result = Partition.compare(pid("1/0-0"), pid("1/1/0-1"));
		expect(result).toBeLessThan(0);

		result = Partition.compare(pid("1/1-4"), pid("0-2"));
		expect(result).toBeNaN();

		result = Partition.compare(pid("1/1-4"), pid("1/0-2"));
		expect(result).toBeNaN();

		result = Partition.compare(pid("1/1-4"), pid("1/0-5"));
		expect(result).toBeNaN();

		result = Partition.compare(pid("1/1-4"), pid("1/2-3"));
		expect(result).toBeNaN();

		result = Partition.compare(pid("1/1-4"), pid("1/2/4-4"));
		expect(result).toBeNaN();

		result = Partition.compare(pid("1/1-4"), pid("1/3-5"));
		expect(result).toBeNaN();
	});

	test("totalOrderCompare", () => {
		let result = Partition.totalOrderCompare(pid("1/2-2"), pid("1/2-2"));
		expect(result).toBe(0);

		result = Partition.totalOrderCompare(pid("1/2-2"), pid("1/3-3"));
		expect(result).toBeLessThan(0);

		result = Partition.totalOrderCompare(pid("1/2-2"), pid("1/1-1"));
		expect(result).toBeGreaterThan(0);

		result = Partition.totalOrderCompare(pid("1/2-2"), pid("1/0-1"));
		expect(result).toBeGreaterThan(0);

		result = Partition.totalOrderCompare(pid("1/0-0"), pid("1/1/0-1"));
		expect(result).toBeLessThan(0);

		result = Partition.totalOrderCompare(pid("1/1-4"), pid("0-2"));
		expect(result).toBeGreaterThan(0);

		result = Partition.totalOrderCompare(pid("1/1-4"), pid("1/0-2"));
		expect(result).toBeGreaterThan(0);

		result = Partition.totalOrderCompare(pid("1/1-4"), pid("1/0-5"));
		expect(result).toBeGreaterThan(0);

		result = Partition.totalOrderCompare(pid("1/1-4"), pid("1/2-3"));
		expect(result).toBeLessThan(0);

		result = Partition.totalOrderCompare(pid("1/1-4"), pid("1/2/4-4"));
		expect(result).toBeLessThan(0);

		result = Partition.totalOrderCompare(pid("1/1-4"), pid("1/3-5"));
		expect(result).toBeLessThan(0);
	});
});

suite("Dom", () => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function formatXml([code]: TemplateStringsArray, ...args: never[]) {
		return code
			.split("\n")
			.map((line) => line.trim())
			.join("")
			.trim();
	}

	const sampleXml: string = formatXml`
		<tag0>
			<tag0>
				<tag0>0/0/0</tag0>
				<tag1>0/0/1</tag1>
				<tag2>0/0/2</tag2>
			</tag0>
			<tag1>
				<tag0>0/1/0</tag0>
				<tag1>0/1/1</tag1>
				<tag2>0/1/2</tag2>
			</tag1>
			<tag2>
				<tag0>0/2/0</tag0>
				<tag1>0/2/1</tag1>
				<tag2>0/2/2</tag2>
			</tag2>
		</tag0>
	`;

	test("traverse", () => {
		let dom = Dom.load("");
		const entries: DomTraversal[] = [];
		let result = dom.traverse((entry) => entries.push(entry));
		expect(entries).toEqual([
			{ node: dom.root, nodeId: NodeId.root(), open: true, close: false },
			{ node: dom.root, nodeId: NodeId.root(), open: false, close: true },
		]);
		expect(result).not.toBe(dom);

		dom = Dom.load(sampleXml);
		const stack: string[] = [];
		result = dom.traverse(({ nodeId, open, close }) => {
			if (open) stack.push(nodeId.toString());
			if (close) expect(stack.pop()).toBe(nodeId.toString());
		});
		expect(result).not.toBe(dom);
	});

	test("tokenize", () => {
		const dom = Dom.load(sampleXml);
		const tokens = dom.tokenize();
		const concatenated = tokens.map((token) => token.content).join("");
		expect(concatenated).toBe(sampleXml);
	});

	test("extractContent", async () => {
		const dom = Dom.load(sampleXml);

		let content = dom.extractContent(NodeId.parse("0/1/2/0"));
		expect(content).toEqual("0/1/2");

		content = dom.extractContent(NodeId.parse("0/1/2"));
		expect(content).toEqual("<tag2>0/1/2</tag2>");

		content = dom.extractContent(Partition.parse("0/1/1-2"));
		expect(content).toEqual("<tag1>0/1/1</tag1><tag2>0/1/2</tag2>");
	});

	test("substituteAll[Merged]", async () => {
		const dom = Dom.load(sampleXml);
		const tr0 = {
			partition: Partition.parse("0/0-0"),
			content: formatXml`
			<tag0>
				<tag0>a/a/a</tag0>
				<tag1>a/a/b</tag1>
				<tag2>a/a/c</tag2>
			</tag0>
		`,
		};
		const tr1 = {
			partition: Partition.parse("0/1/0-1"),
			content: formatXml`
			<tag0>a/b/a</tag0>
			<tag1>a/b/b</tag1>
		`,
		};
		const tr2 = {
			partition: Partition.parse("0/1/2-2"),
			content: formatXml`
			<tag2>a/b/c</tag2>
		`,
		};
		const tr3 = {
			partition: Partition.parse("0/1/1/0-0"),
			content: "a!/b!/b!",
		};

		expect(dom.substituteAll([])).toBe(sampleXml);
		expect(dom.substituteAll([tr0, tr1, tr2])).toBe(
			formatXml`
			<tag0>
				<tag0>
					<tag0>a/a/a</tag0>
					<tag1>a/a/b</tag1>
					<tag2>a/a/c</tag2>
				</tag0>
				<tag1>
					<tag0>a/b/a</tag0>
					<tag1>a/b/b</tag1>
					<tag2>a/b/c</tag2>
				</tag1>
				<tag2>
					<tag0>0/2/0</tag0>
					<tag1>0/2/1</tag1>
					<tag2>0/2/2</tag2>
				</tag2>
			</tag0>
        `,
		);
		expect(() => dom.substituteAll([tr0, tr1, tr2, tr3])).toThrow();
		expect(await dom.substituteAllMerged([tr0, tr1, tr2, tr3])).toBe(
			formatXml`
			<tag0>
				<tag0>
					<tag0>a/a/a</tag0>
					<tag1>a/a/b</tag1>
					<tag2>a/a/c</tag2>
				</tag0>
				<tag1>
					<tag0>a/b/a</tag0>
					<tag1>a!/b!/b!</tag1>
					<tag2>a/b/c</tag2>
				</tag1>
				<tag2>
					<tag0>0/2/0</tag0>
					<tag1>0/2/1</tag1>
					<tag2>0/2/2</tag2>
				</tag2>
			</tag0>
        `,
		);
	});
});
