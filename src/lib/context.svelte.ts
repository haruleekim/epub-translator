import { createContext } from "svelte";
import type { Partition } from "$lib/core/dom";
import type Project from "$lib/project.svelte";

export type WorkspaceMode =
	| "navigate-resources"
	| "add-translation"
	| "list-translations"
	| "project-settings";

export class WorkspaceContext {
	project: Project;
	path: string;
	partition: Partition | null;
	mode: WorkspaceMode;
	locked: boolean;

	constructor(project: Project, path: string) {
		this.project = $state(project);
		this.path = $state(path);
		this.partition = $state(null);
		this.mode = $state("navigate-resources");
		this.locked = $state(false);
	}
}

export const [getWorkspaceContext, setWorkspaceContext] = createContext<WorkspaceContext>();
