import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface DatabaseSchema extends DBSchema {
	projects: {
		key: string;
		value: {
			id: string;
			epub: ArrayBuffer;
			sourceLanguage: string;
			targetLanguage: string;
			createdAt: Date;
		};
	};
}

export async function openDatabase(): Promise<IDBPDatabase<DatabaseSchema>> {
	return await openDB("epub-translator", 1, {
		upgrade(db, oldVersion) {
			if (oldVersion < 1) {
				db.createObjectStore("projects", { keyPath: "id" });
			}
		},
	});
}
