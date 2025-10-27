import { expect, test } from "vitest";
import Epub from "~/lib/epub.ts";

test("resolve resource url", () => {
    const packageDocumentUrl = Epub.resolvePath("OEBPS/package.opf", "/");
    expect(packageDocumentUrl).toBe("OEBPS/package.opf");

    const resourceUrl = Epub.resolvePath("images/cover.jpg", packageDocumentUrl);
    expect(resourceUrl).toBe("OEBPS/images/cover.jpg");
});

test("load sample epub", async () => {
    const { default: url } = await import("~/tests/data/pbr.epub?url");
    const resp = await fetch(url);
    const file = await resp.blob();
    const epub = await Epub.from(file);
    const contentUrl = await epub.getContentVirtualUrl(9);
    expect(contentUrl).include("blob:http://localhost");
    const contentResp = await fetch(contentUrl);
    const content = await contentResp.text();
    expect(content).toContain("Physically Based Rendering");
});
