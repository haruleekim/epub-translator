import { redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";

export function load({ params }) {
	throw redirect(
		307,
		resolve("/[projectId]/[path]/select-partition", {
			...params,
			path: encodeURIComponent(params.path),
		}),
	);
}
