import JSZip from "jszip";
import * as z from "zod";

type ResourceManifest = z.infer<typeof ResourceManifest>;
const ResourceManifest = z.object({
    id: z.string(),
    href: z.string(),
    fallback: z.string().optional(),
    mediaType: z.string(),
    mediaOverlay: z.string().optional(),
    properties: z.array(z.string()).optional(),
});

type MetadataEntry = z.infer<typeof MetadataEntry>;
const MetadataEntry = z.object({
    name: z.string(),
    value: z.string(),
});

export default class Epub {
    private constructor(
        private container: JSZip,
        private metadata: MetadataEntry[],
        private resources: ResourceManifest[],
        private spine: ResourceManifest[],
    ) {}

    async getContent(index: number): Promise<string> {
        const resource = this.spine.at(index);
        const file = this.container.file(resource?.href ?? "");
        const content = await file?.async("text");
        return content ?? "";
    }

    static async from(file: Blob): Promise<Epub> {
        const container = await JSZip.loadAsync(file);

        const containerXml = await parseXmlResource(container, "META-INF/container.xml");
        const pkgDocPath = containerXml.querySelector("rootfile")?.getAttribute("full-path");
        if (!pkgDocPath) throw new Error("No rootfile found");
        const pkg = await parseXmlResource(container, pkgDocPath);

        const metadata: MetadataEntry[] = [];
        for (const entry of pkg.querySelector("metadata")?.children ?? []) {
            if (entry.namespaceURI === "http://purl.org/dc/elements/1.1/") {
                metadata.push(
                    MetadataEntry.parse({
                        name: entry.localName,
                        value: entry.textContent.trim(),
                    }),
                );
            }
        }

        const resources: ResourceManifest[] = [];
        for (const entry of pkg.querySelector("manifest")?.children ?? []) {
            if (entry.tagName === "item") {
                const id = entry.getAttribute("id");
                const href = entry.getAttribute("href");
                const fallback = entry.getAttribute("fallback");
                const mediaType = entry.getAttribute("media-type");
                const mediaOverlay = entry.getAttribute("media-overlay") ?? undefined;
                const properties = entry.getAttribute("properties")?.split(" ");
                resources.push(
                    ResourceManifest.parse({
                        id,
                        href: href ? Epub.resolvePath(href, pkgDocPath) : undefined,
                        fallback: fallback ? Epub.resolvePath(fallback, pkgDocPath) : undefined,
                        mediaType,
                        mediaOverlay,
                        properties,
                    }),
                );
            }
        }

        const spine: ResourceManifest[] = [];
        for (const entry of pkg.querySelector("spine")?.children ?? []) {
            if (entry.tagName === "itemref") {
                const resource = resources.find((res) => res.id === entry.getAttribute("idref"));
                if (!resource) {
                    throw new Error(`Resource not found for idref: ${entry.getAttribute("idref")}`);
                }
                spine.push(resource);
            }
        }

        return new Epub(container, metadata, resources, spine);
    }

    static resolvePath(path: string, base: string): string {
        return new URL(path, `file:///${base}`).pathname.slice(1);
    }
}

async function parseXmlResource(zip: JSZip, resourcePath: string): Promise<Document> {
    const resourceContent = await zip.file(resourcePath)?.async("text");
    if (!resourceContent) throw new Error(`Cannot find \`${resourcePath}\``);
    return new DOMParser().parseFromString(resourceContent, "text/xml");
}
