import { loadAllProjects } from "$lib/database.js";

export async function load() {
	const projects = await loadAllProjects();
	return { projects };
}
