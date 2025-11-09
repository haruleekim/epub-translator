import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ProjectDump } from "$lib/core/project";

export interface DatabaseSchema extends DBSchema {
	projects: {
		key: string;
		value: ProjectDump;
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
