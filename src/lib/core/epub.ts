import JSZip from "jszip";
import PromiseRegistry from "$lib/utils/promise-registry";
import { CSS, parseDocument, type Element, type Node } from "$lib/utils/virtual-dom";

export interface Resource {
	readonly id: string;
	readonly path: string;
	readonly mediaType: string;
	getBlob(): Promise<Blob>;
	getUrl(): Promise<string>;
	resolveUrl(path: string): Promise<string | null>;
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
		private resources: Map<string, Resource>,
		private readonly spine: readonly string[],
	) {}

	get length() {
		return this.spine.length;
	}

	getResourcePaths(): string[] {
		return Array.from(this.resources.keys());
	}

	getResource(path: string): Resource | null {
		return this.resources.get(path) ?? null;
	}

	getSpineItem(index: number): Resource | null {
		const path = this.spine[index];
		return this.getResource(path);
	}

	listSpinePaths(): string[] {
		return [...this.spine];
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
		if (!packageDocumentFile) {
			throw new Error(`Package document not found: ${packageDocumentPath}`);
		}
		const packageDocument = parseDocument(await packageDocumentFile.async("text"), DOM_OPTIONS);

		const resources: Map<string, Resource> = new Map();
		const resourceMapById: Record<string, string> = {};
		const blobRegistry = new PromiseRegistry<string, Blob>(async (path) => {
			const blob = await container.file(path)?.async("blob");
			const resource = resources.get(path);
			if (!blob || !resource) throw new Error(`Resource not found: ${path}`);
			return new Blob([blob], { type: resource.mediaType });
		});
		const urlRegistry = new PromiseRegistry<string, string>(
			async (path) => {
				const blob = await blobRegistry.get(path);
				return URL.createObjectURL(blob);
			},
			async (_path, url) => URL.revokeObjectURL(await url),
		);
		for (const entry of CSS.selectAll<Node, Element>(
			"manifest > item[id][href][media-type]",
			packageDocument,
			DOM_OPTIONS,
		)) {
			const id = entry.attribs.id;
			const path = Epub.resolvePath(entry.attribs.href, packageDocumentPath);
			resourceMapById[id] = path;
			resources.set(path, {
				id,
				path,
				mediaType: entry.attribs["media-type"],
				getBlob: () => blobRegistry.get(path),
				getUrl: () => urlRegistry.get(path),
				resolveUrl: async (url) => {
					const resolvedPath = Epub.resolvePath(url, path);
					const transformed = await resources.get(resolvedPath)?.getUrl();
					return transformed ?? url;
				},
			});
		}

		const spine: string[] = [];
		for (const entry of CSS.selectAll<Node, Element>(
			"spine > itemref[idref]",
			packageDocument,
			DOM_OPTIONS,
		)) {
			const idref = entry.attribs.idref;
			const resource = resourceMapById[idref];
			spine.push(resource);
		}

		return new Epub(resources, spine);
	}

	static resolvePath(path: string, base: string): string {
		return new URL(path, `file:///${base}`).pathname.slice(1);
	}
}
