import JSZip from "jszip";
import _ from "lodash";
import { nanoid } from "nanoid";
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
	doms: Map<string, Dom> = new Map();
	translationIdToPath: Map<string, string> = new Map();

	private constructor(
		public readonly id: string,
		public readonly epub: Readonly<Epub>,
		public readonly sourceLanguage: string,
		public readonly targetLanguage: string,
		public readonly createdAt: Readonly<Date>,
		public readonly translations: Readonly<Map<string, Translation>>,
		public readonly activeTranslationIds: Readonly<Set<string>>,
		public readonly defaultPrompt?: string,
	) {}

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
			...this,
			epub: await this.epub.dump(),
			translations: new Map(
				this.translations.entries().map(([id, tr]) => [id, dumpTranslation(tr)]),
			),
			doms: undefined,
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
		return await container.generateAsync({ type: "blob" });
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
		this.translationIdToPath.set(id, path);
		return id;
	}

	removeTranslation(id: string) {
		this.translations.delete(id);
		this.activeTranslationIds.delete(id);
		this.translationIdToPath.delete(id);
	}

	#recalculateIndices() {
		this.translationIdToPath.clear();
		for (const [id, { path }] of this.translations) {
			this.translationIdToPath.set(id, path);
		}
	}

	activateTranslation(id: string) {
		if (!this.translations.has(id)) throw new Error(`Translation not found: ${id}`);
		this.activeTranslationIds.add(id);
	}

	deactivateTranslation(id: string) {
		this.activeTranslationIds.delete(id);
	}

	listTranslationsForPath(path: string): Translation[] {
		return Array.from(this.translations.values().filter((tr) => tr.path === path));
	}

	getActivatedTranslationIdsForPath(path: string): string[] {
		return Array.from(this.translations.values())
			.filter((tr) => tr.path === path && this.activeTranslationIds.has(tr.id))
			.map((tr) => tr.id);
	}

	setActivatedTranslationsForPath(path: string, ids: string[]) {
		const translations = this.listTranslationsForPath(path);
		for (const tr of translations) {
			if (ids.includes(tr.id)) {
				this.activateTranslation(tr.id);
			} else {
				this.deactivateTranslation(tr.id);
			}
		}
	}

	async #getDom(path: string): Promise<Dom> {
		let dom = this.doms.get(path);
		if (!dom) {
			const resource = this.epub.getResource(path);
			if (!resource) throw new Error(`Resource not found: ${path}`);
			const content = await resource.getBlob().then((blob) => blob.text());
			dom = await Dom.loadAsync(content);
			if (!this.doms.get(path)) this.doms.set(path, dom);
		}
		return dom;
	}

	async getOriginalContent(path: string, arg: NodeId | Partition): Promise<string> {
		const dom = await this.#getDom(path);
		return dom.extractContent(arg);
	}

	async checkOverlaps(translationIds: string[]): Promise<boolean> {
		const grouped = _.groupBy(translationIds, (id) => this.translationIdToPath.get(id));
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

	async renderTranslatedContent(path: string, translationIds: string[]): Promise<string> {
		const dom = await this.#getDom(path);
		translationIds = translationIds.filter((id) => this.translationIdToPath.get(id) === path);
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
