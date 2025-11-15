/* eslint-disable svelte/prefer-svelte-reactivity */
import JSZip from "jszip";
import _ from "lodash";
import { nanoid } from "nanoid";
import { SvelteDate, SvelteMap, SvelteSet } from "svelte/reactivity";
import { Dom, Partition, type NodeId } from "$lib/core/dom";
import Epub from "$lib/core/epub";
import {
	dumpTranslation,
	loadTranslation,
	type Translation,
	type TranslationDump,
} from "$lib/translation";

export type ProjectDump = {
	id: string;
	epub: ArrayBuffer;
	sourceLanguage: string;
	targetLanguage: string;
	createdAt: Date;
	translations: Map<string, TranslationDump>;
	activeTranslationIds: Set<string>;
	defaultPrompt: string | undefined;
};

export default class Project {
	readonly id: string;
	readonly epub: Epub;
	sourceLanguage: string;
	targetLanguage: string;
	createdAt: SvelteDate;
	private translations: SvelteMap<string, Translation>;
	activeTranslationIds: SvelteSet<string>;
	defaultPrompt?: string;

	#doms: SvelteMap<string, Dom> = new SvelteMap();
	#translationIdToPath: SvelteMap<string, string> = new SvelteMap();

	private constructor(
		id: string,
		epub: Epub,
		sourceLanguage: string,
		targetLanguage: string,
		createdAt: Date,
		translations: Map<string, Translation>,
		activeTranslationIds: Set<string>,
		defaultPrompt?: string,
	) {
		this.id = $state(id);
		this.epub = $state(epub);
		this.sourceLanguage = $state(sourceLanguage);
		this.targetLanguage = $state(targetLanguage);
		this.createdAt = new SvelteDate(createdAt);
		this.translations = new SvelteMap(translations);
		this.activeTranslationIds = new SvelteSet(activeTranslationIds);
		this.defaultPrompt = $state(defaultPrompt);
	}

	static create(epub: Epub, sourceLanguage: string, targetLanguage: string) {
		return new Project(
			nanoid(),
			epub,
			sourceLanguage,
			targetLanguage,
			new Date(),
			new Map(),
			new Set(),
		);
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
			hydrated.sourceLanguage,
			hydrated.targetLanguage,
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
			sourceLanguage: this.sourceLanguage,
			targetLanguage: this.targetLanguage,
			createdAt: new Date(this.createdAt),
			translations: new Map(
				this.translations.entries().map(([id, tr]) => [id, dumpTranslation(tr)]),
			),
			activeTranslationIds: new Set(this.activeTranslationIds),
			defaultPrompt: this.defaultPrompt,
		};
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

	async checkOverlaps(translationIds: string[]): Promise<boolean> {
		const grouped = _.groupBy(translationIds, (id) => this.#translationIdToPath.get(id));
		const promises = Object.entries(grouped).map(async ([, ids]) => {
			const partitions = ids.map((id) => {
				const translation = this.translations.get(id);
				if (!translation) throw new Error(`Translation not found: ${id}`);
				return translation.partition;
			});
			return Partition.checkOverlap(partitions);
		});
		const results = await Promise.all(promises);
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
