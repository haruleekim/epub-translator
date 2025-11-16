import { createContext } from "svelte";
import type { Partition } from "$lib/core/dom";
import type Project from "$lib/project.svelte";
import type { Translation } from "$lib/translation";

export type PanelMode = "navigate-resources" | "list-translations" | "project-settings";

export type ViewerMode =
	| "select-partitions-preview"
	| "select-partitions-markup"
	| "preview-translations";

export type PopupMode = Popup["mode"];
export type Popup = {
	mode: "edit-translation";
	translation: Translation | null;
};

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
