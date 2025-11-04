import { expect, test } from "vitest";
import Epub from "@/core/epub";
import sample from "@/tests/sample.epub?url";

test("resolve resource url", () => {
    const packageDocumentUrl = Epub.resolvePath("OEBPS/package.opf", "");
    expect(packageDocumentUrl).toBe("OEBPS/package.opf");

    const resourceUrl = Epub.resolvePath("images/cover.jpg", packageDocumentUrl);
    expect(resourceUrl).toBe("OEBPS/images/cover.jpg");
});

test("load sample epub", async () => {
    const epub = await Epub.load(sample);
    const resource = epub.getSpineItem(1)!;
    const content = await (await resource.getBlob()).text();
    expect(content).toContain("Alice's Adventures in Wonderland");
    expect(await resource.getBlobUrl()).include("blob:http://localhost");
});
