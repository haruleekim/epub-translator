import { openDB, type IDBPDatabase } from "idb";

export async function openDatabase(): Promise<IDBPDatabase> {
	return await openDB("epub-translator", 1, {
		upgrade(db, oldVersion) {
			if (oldVersion < 1) {
				db.createObjectStore("projects", { keyPath: "id" });
			}
		},
	});
}
