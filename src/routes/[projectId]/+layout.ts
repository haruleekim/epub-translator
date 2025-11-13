import { loadProject } from "$lib/database";

export async function load({ params }) {
	const project = await loadProject(params.projectId);
	return { project };
}
