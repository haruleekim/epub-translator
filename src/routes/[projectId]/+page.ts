import { error, redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";

export async function load({ params, parent }) {
	const { project } = await parent();
	const firstSpinePath = project.epub.listSpinePaths()[0];
	if (!firstSpinePath) throw error(404, "No spine items found in the EPUB");
	const encoded = encodeURIComponent(firstSpinePath);
	throw redirect(307, resolve("/[projectId]/[path]", { ...params, path: encoded }));
}
