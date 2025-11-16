import { error } from "@sveltejs/kit";
import type { PanelMode, ViewerMode } from "$lib/context.svelte.js";
import { loadProject } from "$lib/database";

export async function load({ params, url }) {
	const project = await loadProject(params.projectId);

	let path = url.searchParams.get("path");
	if (!path) path = project.epub.listSpinePaths()[0];
	if (!path) throw error(404, "No spine items found in the EPUB");

	let panelMode = url.searchParams.get("panel") as PanelMode | null;
	if (!panelMode) panelMode = "navigate-resources";

	let viewerMode = url.searchParams.get("viewer") as ViewerMode | null;
	if (!viewerMode) viewerMode = "select-partitions-preview";

	return { url, project, path, panelMode, viewerMode };
}
