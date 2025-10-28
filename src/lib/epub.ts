import * as CSS from "css-select";
import { render } from "dom-serializer";
import type { Element, Node } from "domhandler";
import { parseDocument } from "htmlparser2";
import JSZip from "jszip";

const OPTION = { xmlMode: true, decodeEntities: false };

interface Resource {
    id: string;
    path: string;
    mediaType: string;
    originalBlob(): Promise<Blob>;
    viewUrl(): Promise<string>;
    [Symbol.dispose](): void;
}

export default class Epub {
    private constructor(
        private resources: Record<string, Resource>,
        readonly spine: readonly string[],
    ) {}

    get length() {
        return this.spine.length;
    }

    async getContentViewUrl(index: number): Promise<string> {
        const path = this.spine[index];
        const file = this.resources[path];
        return await file.viewUrl();
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
            OPTION,
        )?.attribs["full-path"];
        if (!packageDocumentPath) throw new Error("Cannot resolve package document path");

        const packageDocumentFile = container.file(packageDocumentPath);
        if (!packageDocumentFile)
            throw new Error(`Package document not found: ${packageDocumentPath}`);

        const packageDocument = parseDocument(await packageDocumentFile.async("text"), OPTION);

        const resources: Record<string, Resource> = {};
        const resourceMap: Record<string, string> = {};
        for (const entry of CSS.selectAll<Node, Element>(
            CSS.compile("manifest > item[id][href][media-type]"),
            packageDocument,
            OPTION,
        )) {
            const id = entry.attribs.id;
            const mediaType = entry.attribs["media-type"];
            const path = Epub.resolvePath(entry.attribs.href, packageDocumentPath);

            const file = container.file(path);
            if (!file) throw new Error(`Resource not found: ${path}`);

            let _originalBlob: Blob | null = null;
            async function originalBlob() {
                if (_originalBlob) return _originalBlob;
                _originalBlob = new Blob([await file!.async("blob")], { type: mediaType });
                return _originalBlob;
            }

            let _viewUrl: string | null = null;
            async function viewUrl() {
                if (_viewUrl) return _viewUrl;
                _viewUrl = await createViewUrl(originalBlob, path, mediaType, resources);
                return _viewUrl;
            }

            resources[path] = {
                id,
                path,
                mediaType,
                originalBlob,
                viewUrl,
                [Symbol.dispose]() {
                    if (_viewUrl) URL.revokeObjectURL(_viewUrl);
                },
            };

            resourceMap[id] = path;
        }

        const spine: string[] = [];
        for (const entry of CSS.selectAll<Node, Element>(
            CSS.compile("spine > itemref[idref]"),
            packageDocument,
            OPTION,
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

async function createViewUrl(
    getOriginalBlob: () => Promise<Blob>,
    filePath: string,
    mediaType: string,
    resources: Record<string, Resource>,
): Promise<string> {
    const MEDIA_TYPES = ["application/xhtml+xml", "application/xml", "text/html", "text/xml"];
    if (!MEDIA_TYPES.includes(mediaType)) {
        return URL.createObjectURL(await getOriginalBlob());
    }

    const content = await getOriginalBlob().then((blob) => blob.text());
    const doc = parseDocument(content, OPTION);

    const ATTRS = ["src", "href", "xlink:href"];
    for (const element of CSS.selectAll<Node, Element>(
        CSS.compile(ATTRS.map((attr) => `*[${attr.replace(":", "\\:")}]`).join(", ")),
        doc,
        OPTION,
    )) {
        for (const attr of ATTRS) {
            const path = element.attribs[attr]
                ? Epub.resolvePath(element.attribs[attr], filePath)
                : null;
            if (path && resources[path] && !MEDIA_TYPES.includes(resources[path].mediaType)) {
                element.attribs[attr] = await resources[path].viewUrl();
            }
        }
    }

    return URL.createObjectURL(
        new Blob([render(doc, OPTION)], {
            type: mediaType,
        }),
    );
}
