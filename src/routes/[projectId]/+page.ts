import { error } from "@sveltejs/kit";
import { loadProject } from "$lib/database";

export async function load({ params }) {
	const project = await loadProject(params.projectId);
	const firstSpinePath = project.epub.listSpinePaths()[0];
	if (!firstSpinePath) throw error(404, "No spine items found in the EPUB");
	return { project, path: firstSpinePath };
}
