import * as CSS from "css-select";
import type { Element, Node } from "domhandler";
import { parseDocument } from "htmlparser2";
import JSZip from "jszip";

interface Resource {
    id: string;
    path: string;
    virtualUrl(): Promise<string>;
    [Symbol.dispose](): void;
}

export default class Epub {
    private constructor(
        private container: JSZip,
        private resources: Record<string, Resource>,
        readonly spine: readonly string[],
    ) {}

    get length() {
        return this.spine.length;
    }

    async getContentVirtualUrl(index: number): Promise<string> {
        const path = this.spine[index];
        const file = this.resources[path];
        return await file.virtualUrl();
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

        const resources: Record<string, Resource> = {};
        const resourceMap: Record<string, string> = {};
        for (const entry of CSS.selectAll<Node, Element>(
            CSS.compile("manifest > item[id][href][media-type]"),
            packageDocument,
            { xmlMode: true },
        )) {
            const id = entry.attribs.id;
            const mediaType = entry.attribs["media-type"];
            const path = Epub.resolvePath(entry.attribs.href, packageDocumentPath);
            const file = container.file(path);
            if (!file) throw new Error(`Resource not found: ${path}`);
            let virtualUrl: string | null = null;
            resources[path] = {
                id,
                path,
                async virtualUrl() {
                    if (virtualUrl) return virtualUrl;
                    const blob = new Blob([await file.async("blob")], { type: mediaType });
                    virtualUrl = URL.createObjectURL(blob);
                    return virtualUrl;
                },
                [Symbol.dispose]() {
                    if (virtualUrl) URL.revokeObjectURL(virtualUrl);
                },
            };
            resourceMap[id] = path;
        }

        const spine: string[] = [];
        for (const entry of CSS.selectAll<Node, Element>(
            CSS.compile("spine > itemref[idref]"),
            packageDocument,
            { xmlMode: true },
        )) {
            const idref = entry.attribs.idref;
            const resource = resourceMap[idref];
            spine.push(resource);
        }

        return new Epub(container, resources, spine);
    }

    static resolvePath(path: string, base: string): string {
        return new URL(path, `file:///${base}`).pathname.slice(1);
    }
}
