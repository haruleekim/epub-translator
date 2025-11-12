import { createContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import { openDatabase } from "$lib/database";
import Project from "$lib/project";

export default class Context {
	db = openDatabase();
	projects: Map<string, Project> = new SvelteMap();

	async loadProjectIfNeeded(projectId: string): Promise<Project> {
		let project = this.projects.get(projectId);
		if (project) return project;
		const dump = await (await this.db).get("projects", projectId);
		project = await Project.load(dump);
		this.projects.set(projectId, project);
		return project;
	}

	async saveProject(projectId: string) {
		const project = this.projects.get(projectId);
		if (!project) return;
		const dump = await project.dump();
		await (await this.db).put("projects", dump);
	}

	async reloadAllProjects() {
		const dumps = await (await this.db).getAll("projects");
		const projects = await Promise.all(dumps.map(Project.load));
		this.projects = new SvelteMap(projects.map((p) => [p.id, p]));
	}

	async removeProject(projectId: string) {
		await (await this.db).delete("projects", projectId);
		this.projects.delete(projectId);
	}
}

export const [getContext, setContext] = createContext<Context>();
