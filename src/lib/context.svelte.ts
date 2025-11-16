import { createContext } from "svelte";
import type { Partition } from "$lib/core/dom";
import type Project from "$lib/project.svelte";

export type PanelMode = "navigate-resources" | "list-translations" | "project-settings";

export type ViewerMode =
	| "select-partitions-preview"
	| "select-partitions-markup"
	| "preview-translations";

export type Popup = { mode: "add-translation" };
export type PopupMode = Popup["mode"];

export class WorkspaceContext {
	project: Project;
	path: string;
	partition: Partition | null;
	panelMode: PanelMode;
	viewerMode: ViewerMode;
	popup: Popup | null;
	locked: boolean;

	constructor(project: Project, path: string, panelMode: PanelMode, viewerMode: ViewerMode) {
		this.project = $state(project);
		this.path = $state(path);
		this.partition = $state(null);
		this.panelMode = $state(panelMode);
		this.viewerMode = $state(viewerMode);
		this.popup = $state(null);
		this.locked = $state(false);
	}
}

export const [getWorkspaceContext, setWorkspaceContext] = createContext<WorkspaceContext>();
