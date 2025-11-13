import { openDB, type IDBPDatabase } from "idb";
import Project from "$lib/project";

const db = openDatabase();

export async function openDatabase(): Promise<IDBPDatabase> {
	return await openDB("epub-translator", 1, {
		upgrade(db, oldVersion) {
			if (oldVersion < 1) {
				db.createObjectStore("projects", { keyPath: "id" });
			}
		},
	});
}

export async function loadProject(projectId: string): Promise<Project> {
	const dump = await (await db).get("projects", projectId);
	return Project.load(dump);
}

export async function saveProject(project: Project) {
	const dump = await project.dump();
	await (await db).put("projects", dump);
}

export async function loadAllProjects() {
	const dumps = await (await db).getAll("projects");
	return Promise.all(dumps.map(Project.load));
}

export async function removeProject(projectId: string) {
	await (await db).delete("projects", projectId);
}
