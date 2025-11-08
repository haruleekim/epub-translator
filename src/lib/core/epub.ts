import JSZip from "jszip";
import _ from "lodash";
import { getLanguage, type Language } from "$lib/utils/languages";
import PromiseRegistry from "$lib/utils/promise-registry";
import { CSS, Element, parseDocument, type Node, type Document } from "$lib/utils/virtual-dom";

export type Input =
	| ArrayBuffer
	| Blob
	| Uint8Array
	| URL
	| string
	| Promise<Uint8Array | ArrayBuffer | Blob | URL | string>;

interface PackageDocument {
	path: string;
	content: string;
	dom: Document;
}

export interface Resource {
	readonly id: string;
	readonly path: string;
	readonly mediaType: string;
	readonly properties: string[];
	getBlob(): Promise<Blob>;
	getUrl(): Promise<string>;
	resolveUrl(path: string): Promise<string>;
}

export default class Epub {
	private metadata: Map<string, string[]>;
	private resources: Map<string, Resource>;
	private resourceIndexById: Map<string, string>;
	private resourceIndexByProperty: Map<string, Set<string>>;
	private spine: readonly string[];

	private constructor(
		private readonly container: JSZip,
		packageDocument: PackageDocument,
	) {
		this.metadata = Epub.parseMetadata(packageDocument);
		const manifest = Epub.parseManifest(container, packageDocument);
		this.resources = manifest.resources;
		this.resourceIndexById = manifest.resourceIndexById;
		this.resourceIndexByProperty = manifest.resourceIndexByProperty;
		this.spine = Epub.parseSpine(packageDocument, this.resourceIndexById);
	}

	async dump(): Promise<ArrayBuffer> {
		return await this.container.generateAsync({ type: "arraybuffer" });
	}

	get title(): string | null {
		return this.metadata.get("title")?.at(0) ?? null;
	}

	get author(): string | null {
		return this.metadata.get("creator")?.at(0) ?? null;
	}

	get language(): Language | null {
		const code = this.metadata.get("language")?.at(0);
		return code ? getLanguage(code) : null;
	}

	getCoverImage(): Resource | null {
		let path = this.resourceIndexByProperty.get("cover-image")?.values().next().value;
		if (path) return this.getResource(path);

		const coverResourceId = this.metadata.get("cover")?.at(0);
		path = coverResourceId && this.resourceIndexById.get(coverResourceId);
		if (path) return this.getResource(path);

		return null;
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

	static resolvePath(path: string, base: string): string {
		return new URL(path, `file:///${base}`).pathname.slice(1);
	}

	static async load(input: Input): Promise<Epub> {
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
		const containerXml = parseDocument(await containerXmlFile.async("text"), { xmlMode: true });

		const packageDocumentPath = CSS.selectOne<Node, Element>("rootfile", containerXml, {
			xmlMode: true,
		})?.attribs["full-path"];
		if (!packageDocumentPath) throw new Error("Cannot resolve package document path");
		const packageDocumentFile = container.file(packageDocumentPath);
		if (!packageDocumentFile) {
			throw new Error(`Package document not found: ${packageDocumentPath}`);
		}
		const packageDocumentContent = await packageDocumentFile.async("text");
		const packageDocumentDom = parseDocument(packageDocumentContent, {
			xmlMode: true,
			decodeEntities: true,
			withStartIndices: true,
			withEndIndices: true,
		});

		return new Epub(container, {
			path: packageDocumentPath,
			content: packageDocumentContent,
			dom: packageDocumentDom,
		});
	}

	private static parseMetadata(packageDocument: PackageDocument): Map<string, string[]> {
		const XMLNS_DC = "http://purl.org/dc/elements/1.1/";

		const metadataTag = CSS.selectOne<Node, Element>("metadata", packageDocument.dom, {
			xmlMode: true,
		});

		const entries: { name: string; value: string }[] = [];

		const dcPrefix = metadataTag?.attributes
			.find(({ name, value }) => name.startsWith("xmlns:") && value === XMLNS_DC)
			?.name.slice(6);
		for (const child of metadataTag?.children ?? []) {
			if (!(child instanceof Element)) continue;
			if (dcPrefix && child.tagName.startsWith(`${dcPrefix}:`) && child.firstChild) {
				const name = child.tagName.slice(dcPrefix.length + 1);
				const [start, end] = [child.firstChild.startIndex!, child.lastChild!.endIndex! + 1];
				const value = packageDocument.content.slice(start, end);
				entries.push({ name, value });
			}
			if (child.tagName === "meta" && child.attribs.name && child.attribs.content) {
				const { name, content } = child.attribs;
				entries.push({ name, value: content });
			}
		}

		const metadataMap = _.mapValues(
			_.groupBy(entries, ({ name }) => name),
			(list) => list.map(({ value }) => value),
		);
		return new Map(Object.entries(metadataMap));
	}

	private static parseManifest(container: JSZip, packageDocument: PackageDocument) {
		const resources: Map<string, Resource> = new Map();
		const resourceIndexById: Map<string, string> = new Map();
		const resourceIndexByProperty: Map<string, Set<string>> = new Map();

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
			async (_, url) => URL.revokeObjectURL(await url),
		);

		for (const entry of CSS.selectAll<Node, Element>(
			"manifest > item[id][href][media-type]",
			packageDocument.dom,
			{ xmlMode: true },
		)) {
			const id = entry.attribs.id;
			const path = Epub.resolvePath(entry.attribs.href, packageDocument.path);
			resourceIndexById.set(id, path);

			const properties = entry.attribs["properties"]?.split(" ");
			for (const property of properties ?? []) {
				const paths = resourceIndexByProperty.get(property) ?? new Set();
				resourceIndexByProperty.set(property, paths.add(path));
			}

			resources.set(path, {
				id,
				path,
				properties,
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

		return { resources, resourceIndexById, resourceIndexByProperty };
	}

	private static parseSpine(
		packageDocument: PackageDocument,
		resourceIndexById: Map<string, string>,
	): string[] {
		const spine: string[] = [];
		for (const entry of CSS.selectAll<Node, Element>(
			"spine > itemref[idref]",
			packageDocument.dom,
			{ xmlMode: true },
		)) {
			const idref = entry.attribs.idref;
			const resource = resourceIndexById.get(idref);
			if (resource) spine.push(resource);
		}
		return spine;
	}
}
