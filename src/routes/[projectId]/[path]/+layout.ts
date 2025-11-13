import { error } from "@sveltejs/kit";

export async function load({ params, parent, url }) {
	const { project } = await parent();

	const resource = project.epub.getResource(params.path);
	if (!resource) throw error(404, "Resource not found");

	return { resource, url };
}
