import { expect, test } from "vitest";
import { comparePartition, Translator } from "~/lib/translator.ts";

const sampleDoc: string = `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN"
"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html>
<head>
    <title>My Book</title>
    <meta charset="utf-8" />
</head>
<body>
    <h1>My Book</h1>
    <p>Hello world!</p>
    <p>This is my book.</p>
</body>
</html>`;

test("get original content", async () => {
    const translator = new Translator(sampleDoc);
    expect(translator.getOriginal([1, 1, 1]).textContent).toEqual("My Book");
});

test("register translation", async () => {
    const translator = new Translator(sampleDoc);
    translator.registerTranslation(
        { type: "full", contentId: [1, 0] },
        '<head><title>Mon livre</title><meta charset="utf-8" /></head>',
    );
    translator.registerTranslation(
        { type: "slice", contentId: [1, 1], start: 0, size: 2 },
        "<h1>Mon livre</h1><p>Bonjour monde!</p>",
    );
    translator.registerTranslation(
        { type: "full", contentId: [1, 1, 2] },
        "<p>C'est mon livre.</p>",
    );
    expect(translator.checkOverlap()).toBe(false);

    translator.registerTranslation({ type: "full", contentId: [1, 1, 1, 0] }, "Bonjour monde!");
    expect(translator.checkOverlap()).toBe(true);
});

test("compare partitions", () => {
    let result: number;

    result = comparePartition(
        { type: "full", contentId: [1, 2] },
        { type: "full", contentId: [1, 3] },
    );
    expect(result).toBeLessThan(0);

    result = comparePartition(
        { type: "full", contentId: [1, 2] },
        { type: "full", contentId: [1, 1] },
    );
    expect(result).toBeGreaterThan(0);

    result = comparePartition(
        { type: "full", contentId: [1, 2] },
        { type: "full", contentId: [1, 2] },
    );
    expect(result).toBe(0);

    result = comparePartition(
        { type: "full", contentId: [1, 2] },
        { type: "slice", contentId: [1], start: 3, size: 1 },
    );
    expect(result).toBeLessThan(0);

    result = comparePartition(
        { type: "full", contentId: [1, 2] },
        { type: "slice", contentId: [1], start: 0, size: 2 },
    );
    expect(result).toBeGreaterThan(0);

    result = comparePartition(
        { type: "full", contentId: [1, 2] },
        { type: "slice", contentId: [1], start: 2, size: 1 },
    );
    expect(result).toBeNaN();

    result = comparePartition(
        { type: "slice", contentId: [1, 2], start: 1, size: 2 },
        { type: "slice", contentId: [1, 2], start: 1, size: 2 },
    );
    expect(result).toBe(0);

    result = comparePartition(
        { type: "slice", contentId: [1, 2], start: 1, size: 2 },
        { type: "slice", contentId: [1, 2], start: 3, size: 2 },
    );
    expect(result).toBeLessThan(0);

    result = comparePartition(
        { type: "slice", contentId: [1, 2], start: 1, size: 2 },
        { type: "slice", contentId: [1, 2], start: 0, size: 1 },
    );
    expect(result).toBeGreaterThan(0);

    result = comparePartition(
        { type: "slice", contentId: [1, 2], start: 1, size: 2 },
        { type: "slice", contentId: [1, 2], start: 2, size: 3 },
    );
    expect(result).toBeNaN();

    result = comparePartition(
        { type: "slice", contentId: [1, 2], start: 0, size: 3 },
        { type: "slice", contentId: [1, 2, 3], start: 0, size: 1 },
    );
    expect(result).toBeLessThan(0);

    result = comparePartition(
        { type: "slice", contentId: [1, 2], start: 0, size: 4 },
        { type: "slice", contentId: [1], start: 0, size: 2 },
    );
    expect(result).toBeGreaterThan(0);

    result = comparePartition(
        { type: "slice", contentId: [1, 2], start: 0, size: 4 },
        { type: "slice", contentId: [1], start: 0, size: 3 },
    );
    expect(result).toBeNaN();

    result = comparePartition(
        { type: "slice", contentId: [1, 2], start: 0, size: 4 },
        { type: "slice", contentId: [1, 2, 3], start: 0, size: 1 },
    );
    expect(result).toBeNaN();
});
