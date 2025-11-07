import _ from "lodash";
import type { NodeId, Partition, Translation } from "$lib/core/common";
import TranslationComposer from "$lib/core/composer";
import Epub from "$lib/core/epub";
import type { Input, Resource } from "$lib/core/epub";

export type { Input, Resource };

export default class Translator {
	private composers: Map<string, TranslationComposer> = new Map();
	private translationIdToPath: Map<string, string> = new Map();

	private constructor(private epub: Epub) {}

	static async load(input: Input): Promise<Translator> {
		const epub = await Epub.load(input);
		return new Translator(epub);
	}

	async #getComposer(path: string): Promise<TranslationComposer> {
		let composer = this.composers.get(path);
		if (!composer) {
			const resource = this.epub.getResource(path);
			if (!resource) throw new Error(`Resource not found: ${path}`);
			const content = await resource.getBlob().then((blob) => blob.text());
			composer = new TranslationComposer(content);
			if (!this.composers.get(path)) this.composers.set(path, composer);
		}
		return composer;
	}

	getResourcePaths(): string[] {
		return this.epub.getResourcePaths();
	}

	getResource(path: string): Resource | null {
		return this.epub.getResource(path);
	}

	getSpineItem(index: number): Resource | null {
		return this.epub.getSpineItem(index);
	}

	listSpinePaths(): string[] {
		return this.epub.listSpinePaths();
	}

	async addTranslation(path: string, partition: Partition, content: string): Promise<string> {
		const composer = await this.#getComposer(path);
		const translationId = composer.addTranslation(partition, content);
		this.translationIdToPath.set(translationId, path);
		return translationId;
	}

	async removeTranslation(translationId: string): Promise<void> {
		const path = this.translationIdToPath.get(translationId);
		if (!path) throw new Error(`Translation not found: ${translationId}`);
		const composer = await this.#getComposer(path);
		composer.removeTranslation(translationId);
	}

	async updateTranslation(translationId: string, content: string): Promise<void> {
		const path = this.translationIdToPath.get(translationId);
		if (!path) throw new Error(`Translation not found: ${translationId}`);
		const composer = await this.#getComposer(path);
		composer.updateTranslation(translationId, content);
	}

	async listTranslations(path: string): Promise<Translation[]> {
		const composer = await this.#getComposer(path);
		return composer.listTranslations();
	}

	async getOriginalContent(path: string, arg: NodeId | Partition): Promise<string> {
		const composer = await this.#getComposer(path);
		return composer.getOriginalContent(arg);
	}

	async checkOverlaps(translationIds: string[]): Promise<boolean> {
		const grouped = _.groupBy(translationIds, (id) => this.translationIdToPath.get(id));
		const promises = Object.entries(grouped).map(async ([path, ids]) => {
			const composer = await this.#getComposer(path);
			return composer.checkOverlaps(ids);
		});
		const results = await Promise.all(promises);
		return results.some(_.identity);
	}

	async renderTranslatedContent(path: string, translationIds: string[]): Promise<string> {
		const composer = await this.#getComposer(path);
		translationIds = translationIds.filter((id) => this.translationIdToPath.get(id) === path);
		return composer.render(translationIds);
	}
}
