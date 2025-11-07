import { expect, test } from "vitest";
import { NodeId, Partition } from "$lib/core/common";
import TranslationComposer from "$lib/core/composer";

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
	const tid0 = composer.addTranslation(
		new Partition(new NodeId([2, 0])),
		`<head><title>Mon livre</title><meta charset="utf-8"/></head>`,
	);
	const tid1 = composer.addTranslation(
		new Partition(new NodeId([2, 1, 0]), 2),
		`<h1>Mon livre</h1><p>Bonjour monde!</p>`,
	);
	const tid2 = composer.addTranslation(
		new Partition(new NodeId([2, 1, 2])),
		`<p>C'est mon livre.</p>`,
	);
	expect(composer.checkOverlaps([tid0, tid1, tid2])).toBe(false);

	const tid3 = composer.addTranslation(new Partition(new NodeId([2, 1, 1, 0])), "Bonjour monde!");
	expect(composer.checkOverlaps([tid0, tid1, tid2, tid3])).toBe(true);
	expect(composer.checkOverlaps([tid0, tid1, tid2])).toBe(false);
	expect(composer.checkOverlaps([tid0, tid2, tid3])).toBe(false);

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
