import { createContext } from "svelte";
import type { Partition } from "$lib/core/dom";
import type Project from "$lib/project";
import type { Translation } from "$lib/translation";

export type WorkspaceMode =
	| "navigate-resources"
	| "add-translation"
	| "list-translations"
	| "project-settings";

export interface WorkspaceContext {
	project: Project;
	path: string;
	partition: Partition | null;
	mode: WorkspaceMode;
	locked: boolean;
	translations: Translation[];
	activeTranslationIds: string[];
}

export const [getWorkspaceContext, setWorkspaceContext] = createContext<WorkspaceContext>();
