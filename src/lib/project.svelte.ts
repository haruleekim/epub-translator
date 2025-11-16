/* eslint-disable svelte/prefer-svelte-reactivity */
import JSZip from "jszip";
import _ from "lodash";
import { nanoid } from "nanoid";
import { SvelteDate, SvelteMap, SvelteSet } from "svelte/reactivity";
import { Dom, Partition, type NodeId } from "$lib/core/dom";
import Epub from "$lib/core/epub";
import { saveProject } from "$lib/database";
import {
	dumpTranslation,
	loadTranslation,
	type Translation,
	type TranslationDump,
} from "$lib/translation";

export type ProjectDump = {
	id: string;
	epub: ArrayBuffer;
	createdAt: Date;
	translations: Map<string, TranslationDump>;
	activeTranslationIds: Set<string>;
	defaultPrompt: string;
};

export default class Project {
	readonly id: string;
	readonly epub: Epub;
	createdAt: SvelteDate;
	private translations: SvelteMap<string, Translation>;
	activeTranslationIds: SvelteSet<string>;
	defaultPrompt: string;

	#doms: SvelteMap<string, Dom> = new SvelteMap();
	#translationIdToPath: SvelteMap<string, string> = new SvelteMap();
	#dirty: boolean;

	private constructor(
		id: string,
		epub: Epub,
		createdAt: Date,
		translations: Map<string, Translation>,
		activeTranslationIds: Set<string>,
		defaultPrompt: string,
	) {
		this.id = $state(id);
		this.epub = $state(epub);
		this.createdAt = new SvelteDate(createdAt);
		this.translations = new SvelteMap(translations);
		this.activeTranslationIds = new SvelteSet(activeTranslationIds);
		this.defaultPrompt = $state(defaultPrompt);

		// Only shallow modifications can be detected.
		this.#dirty = $derived.by(() => {
			[
				this.id,
				this.epub,
				this.createdAt,
				this.translations,
				this.activeTranslationIds,
				this.defaultPrompt,
			];
			return true;
		});
		this.#dirty = false;
	}

	static create(epub: Epub, defaultPrompt: string) {
		return new Project(nanoid(), epub, new Date(), new Map(), new Set(), defaultPrompt);
	}

	static async load(dump: ProjectDump): Promise<Project> {
		const hydrated = {
			...dump,
			epub: await Epub.load(dump.epub),
			translations: new Map(
				dump.translations.entries().map(([id, tr]) => [id, loadTranslation(tr)]),
			),
		};
		const project = new Project(
			hydrated.id,
			hydrated.epub,
			hydrated.createdAt,
			hydrated.translations,
			hydrated.activeTranslationIds,
			hydrated.defaultPrompt,
		);
		project.#recalculateIndices();
		return project;
	}

	async dump(): Promise<ProjectDump> {
		return {
			id: this.id,
			epub: await this.epub.dump(),
			createdAt: new Date(this.createdAt),
			translations: new Map(
				this.translations.entries().map(([id, tr]) => [id, dumpTranslation(tr)]),
			),
			activeTranslationIds: new Set(this.activeTranslationIds),
			defaultPrompt: this.defaultPrompt,
		};
	}

	async save(): Promise<void> {
		await saveProject(this);
	}

	get dirty(): boolean {
		return this.#dirty;
	}

	async exportEpub(): Promise<Blob> {
		const container = await JSZip.loadAsync(this.epub.dump());
		const groups = _.groupBy(Array.from(this.translations.values()), (tr) => tr.path);
		const promises = Object.entries(groups).map(async ([path, translations]) => {
			const translationIds = translations.map((t) => t.id);
			const translated = await this.renderTranslatedContent(path, translationIds);
			container.file(path, translated);
		});
		await Promise.all(promises);
		return await container.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
	}

	addTranslation(
		path: string,
		partition: Partition,
		original: string,
		translated: string,
	): string {
		const id = nanoid();
		this.translations.set(id, {
			id,
			path,
			partition,
			original,
			translated,
			createdAt: new Date(),
		});
		this.#translationIdToPath.set(id, path);
		return id;
	}

	removeTranslation(id: string) {
		this.translations.delete(id);
		this.activeTranslationIds.delete(id);
		this.#translationIdToPath.delete(id);
	}

	updateTranslation(id: string, translated: string): Translation {
		const translation = this.translations.get(id);
		if (!translation) throw new Error(`Translation not found: ${id}`);
		translation.translated = translated;
		translation.createdAt = new Date();
		this.translations.set(id, { ...translation });
		return translation;
	}

	#recalculateIndices() {
		this.#translationIdToPath.clear();
		for (const [id, { path }] of this.translations) {
			this.#translationIdToPath.set(id, path);
		}
	}

	translationsForPath(path: string): Translation[] {
		return Array.from(this.translations.values().filter((tr) => tr.path === path));
	}

	activeTranslationsForPath(path: string): Translation[] {
		return Array.from(this.translations.values()).filter(
			(tr) => tr.path === path && this.activeTranslationIds.has(tr.id),
		);
	}

	checkOverlaps(translationIds: string[]): boolean {
		const grouped = _.groupBy(translationIds, (id) => this.#translationIdToPath.get(id));
		const results = Object.entries(grouped).map(([, ids]) => {
			const partitions = ids.map((id) => {
				const translation = this.translations.get(id);
				if (!translation) throw new Error(`Translation not found: ${id}`);
				return translation.partition;
			});
			return Partition.checkOverlap(partitions);
		});
		return results.some(_.identity);
	}

	async #getDom(path: string): Promise<Dom> {
		let dom = this.#doms.get(path);
		if (!dom) {
			const resource = this.epub.getResource(path);
			if (!resource) throw new Error(`Resource not found: ${path}`);
			const content = await resource.getBlob().then((blob) => blob.text());
			dom = await Dom.loadAsync(content);
			if (!this.#doms.get(path)) this.#doms.set(path, dom);
		}
		return dom;
	}

	async getOriginalContent(path: string, arg: NodeId | Partition): Promise<string> {
		const dom = await this.#getDom(path);
		return dom.extractContent(arg);
	}

	async renderTranslatedContent(path: string, translationIds: string[]): Promise<string> {
		const dom = await this.#getDom(path);
		translationIds = translationIds.filter((id) => this.#translationIdToPath.get(id) === path);
		const translations = translationIds.map((id) => {
			const translation = this.translations.get(id);
			if (!translation) throw new Error(`Translation not found: ${id}`);
			return translation;
		});
		return dom.substituteAll(
			translations.map((tr) => ({ partition: tr.partition, content: tr.translated })),
		);
	}
}
