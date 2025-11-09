import _ from "lodash";
import { v4 as uuid } from "uuid";
import { Dom, Partition, type NodeId } from "$lib/core/dom";
import Epub from "$lib/core/epub";
import type { Input, Resource } from "$lib/core/epub";

export type Translation = {
	id: string;
	path: string;
	partition: Partition;
	content: string;
};

export type ProjectDump = {
	id: string;
	epub: ArrayBuffer;
	sourceLanguage: string;
	targetLanguage: string;
	createdAt: Date;
	translations: TranslationDump[];
};

export type TranslationDump = {
	id: string;
	path: string;
	partition: string;
	content: string;
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
	) {}

	static create(epub: Epub, sourceLanguage: string, targetLanguage: string) {
		return new Project(uuid(), epub, sourceLanguage, targetLanguage, new Date(), new Map());
	}

	async dump(): Promise<ProjectDump> {
		return {
			id: this.id,
			epub: await this.epub.dump(),
			sourceLanguage: this.sourceLanguage,
			targetLanguage: this.targetLanguage,
			createdAt: this.createdAt,
			translations: Array.from(
				this.translations.values().map(({ partition, ...tr }) => ({
					partition: partition.toString(),
					...tr,
				})),
			),
		};
	}

	static async load({
		id,
		epub,
		sourceLanguage,
		targetLanguage,
		createdAt,
		translations,
	}: ProjectDump): Promise<Project> {
		if (
			typeof id === "string" &&
			epub instanceof ArrayBuffer &&
			typeof sourceLanguage === "string" &&
			typeof targetLanguage === "string" &&
			createdAt instanceof Date &&
			Array.isArray(translations)
		) {
			const project = new Project(
				id,
				await Epub.load(epub),
				sourceLanguage,
				targetLanguage,
				createdAt,
				new Map(
					translations.map(({ id, partition, ...tr }) => [
						id,
						{ id, partition: Partition.parse(partition), ...tr },
					]),
				),
			);
			project.#recalculateIndices();
			return project;
		} else {
			throw new Error(`Cannot load project ${id}`);
		}
	}

	#recalculateIndices() {
		this.translationIdToPath.clear();
		for (const [id, { path }] of this.translations) {
			this.translationIdToPath.set(id, path);
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
		return dom.substituteAll(translations);
	}
}

export type { Input, Resource };
