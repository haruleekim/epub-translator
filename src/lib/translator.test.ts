import { expect, test } from "vitest";
import { ContentId, Partition, Translator } from "~/lib/translator.ts";

const sampleDoc: string = `
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
    expect(translator.getOriginalNode(new ContentId([1, 1, 1])).textContent).toEqual(
        "Hello world!",
    );
});

test("register translation", async () => {
    const translator = new Translator(sampleDoc);
    translator.registerTranslation(
        new Partition(new ContentId([1, 0])),
        `<head><title>Mon livre</title><meta charset="utf-8"/></head>`,
    );
    translator.registerTranslation(
        new Partition(new ContentId([1, 1, 0]), 2),
        `<h1>Mon livre</h1><p>Bonjour monde!</p>`,
    );
    translator.registerTranslation(
        new Partition(new ContentId([1, 1, 2])),
        `<p>C'est mon livre.</p>`,
    );
    expect(translator.hasOverlappingTranslations()).toBe(false);

    translator.registerTranslation(new Partition(new ContentId([1, 1, 1, 0])), "Bonjour monde!");
    expect(translator.hasOverlappingTranslations()).toBe(true);
    expect(translator.hasOverlappingTranslations([0, 1, 3])).toBe(false);
    expect(translator.hasOverlappingTranslations([0, 2, 3])).toBe(false);

    expect(translator.render([])).toBe(sampleDoc);
    expect(translator.render([0, 1, 3])).toBe(
        `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
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

test("compare content ids", () => {
    let result: number;

    result = ContentId.compare(new ContentId([1, 1]), new ContentId([1, 2]));
    expect(result).toBeLessThan(0);

    result = ContentId.compare(new ContentId([1, 1]), new ContentId([1, 1]));
    expect(result).toBe(0);

    result = ContentId.compare(new ContentId([1, 1]), new ContentId([1, 0]));
    expect(result).toBeGreaterThan(0);

    result = ContentId.compare(new ContentId([1, 1]), new ContentId([1, 1, 1]));
    expect(result).toBeNaN();
});

test("compare partitions", () => {
    let result: number;

    result = Partition.compare(
        new Partition(new ContentId([1, 2])),
        new Partition(new ContentId([1, 3])),
    );
    expect(result).toBeLessThan(0);

    result = Partition.compare(
        new Partition(new ContentId([1, 2])),
        new Partition(new ContentId([1, 1])),
    );
    expect(result).toBeGreaterThan(0);

    result = Partition.compare(
        new Partition(new ContentId([1, 2])),
        new Partition(new ContentId([1, 2])),
    );
    expect(result).toBe(0);

    result = Partition.compare(
        new Partition(new ContentId([1, 2])),
        new Partition(new ContentId([1, 3])),
    );
    expect(result).toBeLessThan(0);

    result = Partition.compare(
        new Partition(new ContentId([1, 2])),
        new Partition(new ContentId([1, 0]), 2),
    );
    expect(result).toBeGreaterThan(0);

    result = Partition.compare(
        new Partition(new ContentId([1, 0])),
        new Partition(new ContentId([1, 1, 0]), 2),
    );
    expect(result).toBeLessThan(0);

    result = Partition.compare(
        new Partition(new ContentId([1, 1]), 4),
        new Partition(new ContentId([1, 2, 4])),
    );
    expect(result).toBeNaN();
});
