import { expect, test } from "vitest";
import Epub from "@/core/epub";

test("resolve resource url", () => {
    const packageDocumentUrl = Epub.resolvePath("OEBPS/package.opf", "/");
    expect(packageDocumentUrl).toBe("OEBPS/package.opf");

    const resourceUrl = Epub.resolvePath("images/cover.jpg", packageDocumentUrl);
    expect(resourceUrl).toBe("OEBPS/images/cover.jpg");
});

test("load sample epub", async () => {
    const { default: url } = await import("../../tests/data/pbr.epub?url");
    const resp = await fetch(url);
    const file = await resp.blob();
    const epub = await Epub.from(file);
    const resource = epub.getSpineItem(9);
    expect(await (await resource.getBlob()).text()).toContain("Physically Based Rendering");
    expect(await resource.getBlobUrl()).include("blob:http://localhost");
});
