import * as CSS from "css-select";
import type { Element, Node } from "domhandler";
import { parseDocument } from "htmlparser2";
import JSZip from "jszip";

const DOM_OPTIONS = { xmlMode: true, decodeEntities: false };

export interface ManifestResource {
    readonly id: string;
    readonly path: string;
    readonly mediaType: string;
    getBlob(): Promise<Blob>;
    getBlobUrl(): Promise<string>;
    [Symbol.dispose](): void;
}

export default class Epub {
    private constructor(
        private resources: Record<string, ManifestResource>,
        readonly spine: readonly string[],
    ) {}

    get length() {
        return this.spine.length;
    }

    getResource(path: string) {
        return this.resources[path];
    }

    getSpineItem(index: number): ManifestResource {
        const path = this.spine[index];
        return this.resources[path];
    }

    static async from(file: Blob): Promise<Epub> {
        const container = await JSZip.loadAsync(file);

        const containerXmlFile = container.file("META-INF/container.xml");
        if (!containerXmlFile) throw new Error("Container file not found");

        const containerXml = parseDocument(await containerXmlFile.async("text"), {
            xmlMode: true,
            decodeEntities: false,
        });

        const packageDocumentPath = CSS.selectOne<Node, Element>(
            CSS.compile("rootfile"),
            containerXml,
            DOM_OPTIONS,
        )?.attribs["full-path"];
        if (!packageDocumentPath) throw new Error("Cannot resolve package document path");

        const packageDocumentFile = container.file(packageDocumentPath);
        if (!packageDocumentFile)
            throw new Error(`Package document not found: ${packageDocumentPath}`);

        const packageDocument = parseDocument(await packageDocumentFile.async("text"), DOM_OPTIONS);

        const resources: Record<string, ManifestResource> = {};
        const resourceMap: Record<string, string> = {};
        for (const entry of CSS.selectAll<Node, Element>(
            CSS.compile("manifest > item[id][href][media-type]"),
            packageDocument,
            DOM_OPTIONS,
        )) {
            const id = entry.attribs.id;
            const mediaType = entry.attribs["media-type"];
            const path = Epub.resolvePath(entry.attribs.href, packageDocumentPath);

            const file = container.file(path);
            if (!file) throw new Error(`Resource not found: ${path}`);

            let _blob: Blob | null = null;
            async function getBlob() {
                if (_blob) return _blob;
                _blob = new Blob([await file!.async("blob")], { type: mediaType });
                return _blob;
            }

            let _blobUrl: string | null = null;
            async function getBlobUrl() {
                if (_blobUrl) return _blobUrl;
                _blobUrl = URL.createObjectURL(await getBlob());
                return _blobUrl;
            }

            resources[path] = {
                id,
                path,
                mediaType,
                getBlob,
                getBlobUrl,
                [Symbol.dispose]() {
                    if (_blobUrl) URL.revokeObjectURL(_blobUrl);
                },
            };

            resourceMap[id] = path;
        }

        const spine: string[] = [];
        for (const entry of CSS.selectAll<Node, Element>(
            CSS.compile("spine > itemref[idref]"),
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
