import { expect, test } from "vitest";
import { NodeId, Partition, Translator } from "@/core/translator";

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
    const translator = new Translator(sampleDoc);
    const content = translator.getOriginalContent(new NodeId([2, 1, 1]));
    expect(content).toEqual("<p>Hello world!</p>");
});

test("register translation", async () => {
    const translator = new Translator(sampleDoc);
    translator.registerTranslation(
        new Partition(new NodeId([2, 0])),
        `<head><title>Mon livre</title><meta charset="utf-8"/></head>`,
    );
    translator.registerTranslation(
        new Partition(new NodeId([2, 1, 0]), 2),
        `<h1>Mon livre</h1><p>Bonjour monde!</p>`,
    );
    translator.registerTranslation(new Partition(new NodeId([2, 1, 2])), `<p>C'est mon livre.</p>`);
    expect(translator.hasOverlappingTranslations()).toBe(false);

    translator.registerTranslation(new Partition(new NodeId([2, 1, 1, 0])), "Bonjour monde!");
    expect(translator.hasOverlappingTranslations()).toBe(true);
    expect(translator.hasOverlappingTranslations([0, 1, 3])).toBe(false);
    expect(translator.hasOverlappingTranslations([0, 2, 3])).toBe(false);

    expect(translator.render([])).toBe(sampleDoc);
    expect(translator.render([0, 1, 3])).toBe(
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
