import { expect, test } from "vitest";
import { NodeId, Partition, Dom } from "$lib/core/dom";

test("parent of the root node is null", () => {
	const root = new NodeId([]);
	expect(root.parent).toStrictEqual(null);
});

test("siblings of the root node are null", () => {
	const root = new NodeId([]);
	expect(root.sibling(1)).toBeNull();
	expect(root.sibling(-1)).toBeNull();
});

test("parse node ids", () => {
	expect(NodeId.parse("")).toStrictEqual(new NodeId([]));
	expect(NodeId.parse("1")).toStrictEqual(new NodeId([1]));
	expect(NodeId.parse("1/2")).toStrictEqual(new NodeId([1, 2]));
	expect(NodeId.parse("1/2/3")).toStrictEqual(new NodeId([1, 2, 3]));
});

test("serialize node ids", () => {
	expect(new NodeId([]).toString()).toBe("");
	expect(new NodeId([1]).toString()).toBe("1");
	expect(new NodeId([1, 2]).toString()).toBe("1/2");
	expect(new NodeId([1, 2, 3]).toString()).toBe("1/2/3");
});

test("get common ancestors", () => {
	expect(NodeId.commonAncestor(new NodeId([1, 2, 3]), new NodeId([1, 2, 4]))).toStrictEqual(
		new NodeId([1, 2]),
	);
	expect(NodeId.commonAncestor(new NodeId([1, 2, 3]), new NodeId([1, 2]))).toStrictEqual(
		new NodeId([1, 2]),
	);
	expect(NodeId.commonAncestor(new NodeId([1, 2, 3]), new NodeId([1]))).toStrictEqual(
		new NodeId([1]),
	);
	expect(NodeId.commonAncestor(new NodeId([1, 2, 3]), new NodeId([2]))).toStrictEqual(
		new NodeId([]),
	);
});

test("compare node ids", () => {
	let result: number;

	result = NodeId.compare(new NodeId([1, 1]), new NodeId([1, 2]));
	expect(result).toBeLessThan(0);

	result = NodeId.compare(new NodeId([1, 1]), new NodeId([1, 1]));
	expect(result).toBe(0);

	result = NodeId.compare(new NodeId([1, 1]), new NodeId([1, 0]));
	expect(result).toBeGreaterThan(0);

	result = NodeId.compare(new NodeId([1, 1]), new NodeId([1, 1, 1]));
	expect(result).toBeNaN();
});

test("compare partitions", () => {
	let result: number;

	result = Partition.compare(
		new Partition(new NodeId([1, 2])),
		new Partition(new NodeId([1, 3])),
	);
	expect(result).toBeLessThan(0);

	result = Partition.compare(
		new Partition(new NodeId([1, 2])),
		new Partition(new NodeId([1, 1])),
	);
	expect(result).toBeGreaterThan(0);

	result = Partition.compare(
		new Partition(new NodeId([1, 2])),
		new Partition(new NodeId([1, 2])),
	);
	expect(result).toBe(0);

	result = Partition.compare(
		new Partition(new NodeId([1, 2])),
		new Partition(new NodeId([1, 3])),
	);
	expect(result).toBeLessThan(0);

	result = Partition.compare(
		new Partition(new NodeId([1, 2])),
		new Partition(new NodeId([1, 0]), 2),
	);
	expect(result).toBeGreaterThan(0);

	result = Partition.compare(
		new Partition(new NodeId([1, 0])),
		new Partition(new NodeId([1, 1, 0]), 2),
	);
	expect(result).toBeLessThan(0);

	result = Partition.compare(
		new Partition(new NodeId([1, 1]), 4),
		new Partition(new NodeId([1, 2, 4])),
	);
	expect(result).toBeNaN();
});

test("check if partition contains node id", () => {
	let partition: Partition;

	partition = new Partition(new NodeId([1, 2]));
	expect(partition.contains(new NodeId([1, 2]))).toBe(true);
	expect(partition.contains(new NodeId([1, 3]))).toBe(false);
	expect(partition.contains(new NodeId([1, 2, 3]))).toBe(true);

	partition = new Partition(new NodeId([1, 2]), 2);
	expect(partition.contains(new NodeId([1, 2]))).toBe(true);
	expect(partition.contains(new NodeId([1, 3]))).toBe(true);
	expect(partition.contains(new NodeId([1, 4]))).toBe(false);
	expect(partition.contains(new NodeId([1, 2, 3]))).toBe(true);
});

const sampleDoc: string = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <title>My Book</title>
    <meta charset="utf-8"/>
</head>
<body>
    <h1>My Book</h1>
    <p>Hello world!</p>
    <p>This is my book.</p>
</body>
</html>`
	.split("\n")
	.map((line) => line.trim())
	.join("");

test("traverse nodes", () => {
	const text = sampleDoc;
	const dom = Dom.load(text);

	const stack: string[] = [];
	let content = "";
	for (const { open, nodeId, node } of dom.iterate()) {
		if (open) {
			stack.push(nodeId.toString());
		} else {
			expect(nodeId.toString()).toBe(stack.pop());
		}
		let start: number, end: number;
		if ("children" in node && node.children.length > 0) {
			if (open) {
				start = node.startIndex!;
				end = node.firstChild!.startIndex!;
			} else {
				start = node.lastChild!.endIndex! + 1;
				end = node.endIndex! + 1;
			}
			content += text.slice(start, end);
		} else if (open) {
			content += text.slice(node.startIndex!, node.endIndex! + 1);
		}
	}
	expect(stack).toEqual([]);
	expect(content).toBe(text);
});

test("traverse empty document", () => {
	const dom = Dom.load("");
	const iterator = dom.iterate();
	expect(iterator.next().value).toEqual({
		node: dom.root,
		nodeId: new NodeId([]),
		open: true,
		close: false,
	});
	expect(iterator.next().value).toEqual({
		node: dom.root,
		nodeId: new NodeId([]),
		open: false,
		close: true,
	});
	expect(iterator.next().done).toBeTruthy();
});

test("extract content", async () => {
	const dom = Dom.load(sampleDoc);
	const content = dom.extractContent(new NodeId([2, 1, 1]));
	expect(content).toEqual("<p>Hello world!</p>");
});

test("substitute content", async () => {
	const dom = Dom.load(sampleDoc);
	const tr0 = {
		partition: new Partition(new NodeId([2, 0])),
		content: `<head><title>Mon livre</title><meta charset="utf-8"/></head>`,
	};
	const tr1 = {
		partition: new Partition(new NodeId([2, 1, 0]), 2),
		content: `<h1>Mon livre</h1><p>Bonjour monde!</p>`,
	};
	const tr2 = {
		partition: new Partition(new NodeId([2, 1, 2])),
		content: `<p>C'est mon livre.</p>`,
	};
	const tr3 = {
		partition: new Partition(new NodeId([2, 1, 1, 0])),
		content: "Bonjour monde!",
	};

	expect(dom.substituteAll([])).toBe(sampleDoc);
	expect(dom.substituteAll([tr0, tr1, tr2])).toBe(
		`<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
        <head>
            <title>Mon livre</title>
            <meta charset="utf-8"/>
        </head>
        <body>
            <h1>Mon livre</h1>
            <p>Bonjour monde!</p>
            <p>C'est mon livre.</p>
        </body>
        </html>`
			.split("\n")
			.map((line) => line.trim())
			.join(""),
	);
	expect(() => dom.substituteAll([tr0, tr1, tr2, tr3])).toThrow();
});
