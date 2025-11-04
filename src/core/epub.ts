import JSZip from "jszip";
import { CSS, parseDocument, type Element, type Node } from "@/utils/virtual-dom";

export interface Resource {
    readonly id: string;
    readonly path: string;
    readonly mediaType: string;
    getBlob(): Promise<Blob>;
    getBlobUrl(): Promise<string>;
    [Symbol.asyncDispose](): void;
}

export type Input =
    | ArrayBuffer
    | Blob
    | Uint8Array
    | URL
    | string
    | Promise<Uint8Array | ArrayBuffer | Blob | URL | string>;

export default class Epub {
    private constructor(
        private resources: Record<string, Resource>,
        readonly spine: readonly string[],
    ) {}

    get length() {
        return this.spine.length;
    }

    getResourcePaths(): string[] {
        return Object.keys(this.resources);
    }

    getResource(path: string) {
        const resource = this.resources[path];
        if (!resource) throw new Error(`Resource not found: ${path}`);
        return resource;
    }

    getSpineItem(index: number): Resource {
        const path = this.spine[index];
        return this.getResource(path);
    }

    static async load(input: Input): Promise<Epub> {
        const DOM_OPTIONS = { xmlMode: true, decodeEntities: false };

        input = await input;
        let file: ArrayBuffer | Blob | Uint8Array;
        if (input instanceof URL || typeof input === "string") {
            file = await fetch(input).then((resp) => resp.blob());
        } else {
            file = input;
        }

        const container = await JSZip.loadAsync(file);

        const containerXmlFile = container.file("META-INF/container.xml");
        if (!containerXmlFile) throw new Error("Container file not found");

        const containerXml = parseDocument(await containerXmlFile.async("text"), DOM_OPTIONS);

        const packageDocumentPath = CSS.selectOne<Node, Element>(
            "rootfile",
            containerXml,
            DOM_OPTIONS,
        )?.attribs["full-path"];
        if (!packageDocumentPath) throw new Error("Cannot resolve package document path");

        const packageDocumentFile = container.file(packageDocumentPath);
        if (!packageDocumentFile)
            throw new Error(`Package document not found: ${packageDocumentPath}`);

        const packageDocument = parseDocument(await packageDocumentFile.async("text"), DOM_OPTIONS);

        const resources: Record<string, Resource> = {};
        const resourceMap: Record<string, string> = {};
        for (const entry of CSS.selectAll<Node, Element>(
            "manifest > item[id][href][media-type]",
            packageDocument,
            DOM_OPTIONS,
        )) {
            const id = entry.attribs.id;
            const mediaType = entry.attribs["media-type"];
            const path = Epub.resolvePath(entry.attribs.href, packageDocumentPath);

            const file = container.file(path);
            if (!file) throw new Error(`Resource not found: ${path}`);

            let _blob: Promise<Blob> | null = null;
            function getBlob() {
                if (_blob) return _blob;
                _blob = file!.async("blob").then((blob) => new Blob([blob], { type: mediaType }));
                return _blob;
            }

            let _blobUrl: Promise<string> | null = null;
            function getBlobUrl() {
                if (_blobUrl) return _blobUrl;
                _blobUrl = getBlob().then(URL.createObjectURL);
                return _blobUrl;
            }

            resources[path] = {
                id,
                path,
                mediaType,
                getBlob,
                getBlobUrl,
                async [Symbol.asyncDispose]() {
                    if (_blobUrl) URL.revokeObjectURL(await _blobUrl);
                },
            };

            resourceMap[id] = path;
        }

        const spine: string[] = [];
        for (const entry of CSS.selectAll<Node, Element>(
            "spine > itemref[idref]",
            packageDocument,
            DOM_OPTIONS,
        )) {
            const idref = entry.attribs.idref;
            const resource = resourceMap[idref];
            spine.push(resource);
        }

        return new Epub(resources, spine);
    }

    static resolvePath(path: string, base: string): string {
        return new URL(path, `file:///${base}`).pathname.slice(1);
    }
}
