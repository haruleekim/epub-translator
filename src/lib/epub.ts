import * as CSS from "css-select";
import type { Element, Node } from "domhandler";
import { parseDocument } from "htmlparser2";
import JSZip from "jszip";

export default class Epub {
    private constructor(
        private container: JSZip,
        readonly spine: readonly string[],
    ) {}

    get length() {
        return this.spine.length;
    }

    async getContent(index: number): Promise<string> {
        const href = this.spine[index];
        const file = this.container.file(href);
        if (!file) throw new Error(`File not found: ${href}`);
        return await file.async("text");
    }

    static async from(file: Blob): Promise<Epub> {
        const container = await JSZip.loadAsync(file);

        const containerXmlFile = container.file("META-INF/container.xml");
        if (!containerXmlFile) throw new Error("Container file not found");

        const containerXml = parseDocument(await containerXmlFile.async("text"), { xmlMode: true });

        const packageDocumentPath = CSS.selectOne<Node, Element>(
            CSS.compile("rootfile"),
            containerXml,
            { xmlMode: true },
        )?.attribs["full-path"];
        if (!packageDocumentPath) throw new Error("Cannot resolve package document path");

        const packageDocumentFile = container.file(packageDocumentPath);
        if (!packageDocumentFile)
            throw new Error(`Package document not found: ${packageDocumentPath}`);

        const packageDocument = parseDocument(await packageDocumentFile.async("text"), {
            xmlMode: true,
        });

        const resources: Record<string, string> = {};
        for (const entry of CSS.selectAll<Node, Element>(
            CSS.compile("manifest > item[id][href]"),
            packageDocument,
            { xmlMode: true },
        )) {
            const id = entry.attribs.id;
            const href = entry.attribs.href;
            resources[id] = Epub.resolvePath(href, packageDocumentPath);
        }

        const spine: string[] = [];
        for (const entry of CSS.selectAll<Node, Element>(
            CSS.compile("spine > itemref[idref]"),
            packageDocument,
            { xmlMode: true },
        )) {
            const idref = entry.attribs.idref;
            const resource = resources[idref];
            spine.push(resource);
        }

        return new Epub(container, spine);
    }

    static resolvePath(path: string, base: string): string {
        return new URL(path, `file:///${base}`).pathname.slice(1);
    }
}
