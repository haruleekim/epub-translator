import { v4 as uuid } from "uuid";
import Epub from "$lib/core/epub";
import { type DatabaseSchema } from "$lib/database";

type Serialized = DatabaseSchema["projects"]["value"];

export default class Project {
	private constructor(
		public readonly id: string,
		public readonly epub: Readonly<Epub>,
		public readonly sourceLanguage: string,
		public readonly targetLanguage: string,
		public readonly createdAt: Date,
	) {}

	static create(epub: Epub, sourceLanguage: string, targetLanguage: string) {
		return new Project(uuid(), epub, sourceLanguage, targetLanguage, new Date());
	}

	async dump(): Promise<Serialized> {
		return {
			id: this.id,
			epub: await this.epub.dump(),
			sourceLanguage: this.sourceLanguage,
			targetLanguage: this.targetLanguage,
			createdAt: this.createdAt,
		};
	}

	static async load({
		id,
		epub,
		sourceLanguage,
		targetLanguage,
		createdAt,
	}: Serialized): Promise<Project> {
		if (
			typeof id === "string" &&
			epub instanceof ArrayBuffer &&
			typeof sourceLanguage === "string" &&
			typeof targetLanguage === "string" &&
			createdAt instanceof Date
		) {
			return new Project(
				id,
				await Epub.load(epub),
				sourceLanguage,
				targetLanguage,
				createdAt,
			);
		} else {
			throw new Error(`Cannot load project ${id}`);
		}
	}
}
