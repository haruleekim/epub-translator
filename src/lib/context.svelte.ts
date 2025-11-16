import { createContext } from "svelte";
import type { Partition } from "$lib/core/dom";
import type Project from "$lib/project.svelte";

export type PanelMode =
	| "navigate-resources"
	| "add-translation"
	| "list-translations"
	| "project-settings";

export type ViewerMode = "select-partitions" | "preview-translations";

export class WorkspaceContext {
	project: Project;
	path: string;
	partition: Partition | null;
	panelMode: PanelMode;
	viewerMode: ViewerMode;
	locked: boolean;

	constructor(project: Project, path: string, panelMode: PanelMode, viewerMode: ViewerMode) {
		this.project = $state(project);
		this.path = $state(path);
		this.partition = $state(null);
		this.panelMode = $state(panelMode);
		this.viewerMode = $state(viewerMode);
		this.locked = $state(false);
	}
}

export const [getWorkspaceContext, setWorkspaceContext] = createContext<WorkspaceContext>();
