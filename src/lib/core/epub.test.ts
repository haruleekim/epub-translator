import fs from "node:fs/promises";
import { expect, test } from "vitest";
import Epub from "$lib/core/epub";

test("resolve resource url", () => {
	const packageDocumentUrl = Epub.resolvePath("OEBPS/package.opf", "");
	expect(packageDocumentUrl).toBe("OEBPS/package.opf");

	const resourceUrl = Epub.resolvePath("images/cover.jpg", packageDocumentUrl);
	expect(resourceUrl).toBe("OEBPS/images/cover.jpg");
});

test("load sample epub", async () => {
	const file = await fs.readFile(new URL("../data/sample.epub", import.meta.url));
	const epub = await Epub.load(file);
	const resource = epub.getSpineItem(1)!;
	const content = await (await resource.getBlob()).text();
	expect(content).toContain("Alice's Adventures in Wonderland");
	expect(await resource.getUrl()).matches(/^blob:/);
});

test("load metadata", async () => {
	const file = await fs.readFile(new URL("../data/sample.epub", import.meta.url));
	const epub = await Epub.load(file);
	expect(epub.title).toBe("Alice's Adventures in Wonderland");
	expect(epub.author).toStrictEqual("Lewis Carroll");
	expect(epub.language?.code).toBe("eng");
});

test("load cover image", async () => {
	const file = await fs.readFile(new URL("../data/sample.epub", import.meta.url));
	const epub = await Epub.load(file);
	const cover = epub.getCoverImage();
	expect(cover).toBeTruthy();
	expect(await cover!.getUrl()).matches(/^blob:/);
});
