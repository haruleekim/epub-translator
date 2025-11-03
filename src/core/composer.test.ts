import { expect, test } from "vitest";
import { NodeId, Partition, TranslationComposer } from "@/core/composer";

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

test("get original content", async () => {
    const composer = new TranslationComposer(sampleDoc);
    const content = composer.getOriginalContent(new NodeId([2, 1, 1]));
    expect(content).toEqual("<p>Hello world!</p>");
});

test("register translation", async () => {
    const composer = new TranslationComposer(sampleDoc);
    const tid0 = composer.registerTranslation(
        new Partition(new NodeId([2, 0])),
        `<head><title>Mon livre</title><meta charset="utf-8"/></head>`,
    );
    const tid1 = composer.registerTranslation(
        new Partition(new NodeId([2, 1, 0]), 2),
        `<h1>Mon livre</h1><p>Bonjour monde!</p>`,
    );
    const tid2 = composer.registerTranslation(
        new Partition(new NodeId([2, 1, 2])),
        `<p>C'est mon livre.</p>`,
    );
    expect(composer.hasOverlappingTranslations()).toBe(false);

    const tid3 = composer.registerTranslation(
        new Partition(new NodeId([2, 1, 1, 0])),
        "Bonjour monde!",
    );
    expect(composer.hasOverlappingTranslations()).toBe(true);
    expect(composer.hasOverlappingTranslations([tid0, tid1, tid2])).toBe(false);
    expect(composer.hasOverlappingTranslations([tid0, tid2, tid3])).toBe(false);

    expect(composer.render([])).toBe(sampleDoc);
    expect(composer.render([tid0, tid1, tid2])).toBe(
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
});

test("parent of the root node is itself", () => {
    const root = new NodeId([]);
    expect(root.parent()).toStrictEqual(root);
});

test("a sibling of the root node are itself", () => {
    const root = new NodeId([]);
    expect(root.sibling(1)).toStrictEqual(root);
    expect(root.sibling(-1)).toStrictEqual(root);
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
