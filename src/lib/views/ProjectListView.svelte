<script lang="ts">
	import IconAddCircleOutline from "virtual:icons/mdi/add-circle-outline";
	import IconTrashCan from "virtual:icons/mdi/trash-can";
	import { resolve } from "$app/paths";
	import { removeProject } from "$lib/database";
	import Project from "$lib/project.svelte";
	import ProjectCreationDialog from "$lib/views/ProjectCreationDialog.svelte";

	const props: { projects: Project[] } = $props();
	const projects = $state(
		props.projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
	);

	let dialogOpen = $state(false);
</script>

{#if dialogOpen}
	<ProjectCreationDialog
		bind:open={dialogOpen}
		onCreate={async (project) => {
			projects.splice(0, 0, project);
			dialogOpen = false;
			await project.save();
		}}
	/>
{/if}

<div class="container mx-auto p-4">
	<button
		type="button"
		class="btn mx-auto flex rounded-full btn-ghost"
		onclick={() => (dialogOpen = true)}
	>
		<IconAddCircleOutline class="size-6" />
		New Project
	</button>

	<ul class="list mt-4">
		{#each projects as project (project.id)}
			{@render projectItem(project)}
		{/each}
	</ul>
</div>

{#snippet projectItem(project: Project)}
	{@const epub = project.epub}
	<li class="list-row transition-all hover:bg-base-200">
		<a class="contents" href={resolve("/[projectId]", { projectId: project.id })}>
			<div>
				<img
					src={await epub.getCoverImage()?.getUrl()}
					alt={epub.title}
					class="size-16 object-contain"
				/>
			</div>
			<div>
				<div class="text-lg">{epub.title}</div>
				<div class="text-xs font-semibold text-base-content/50">{epub.author}</div>
				<div class="text-xs text-base-content/50">
					{project.createdAt.toISOString()}
				</div>
			</div>
		</a>
		<div class="ml-4 flex items-center">
			<button
				class="btn btn-circle btn-soft btn-error"
				onclick={async () => {
					if (confirm("Are you sure you want to delete this project?")) {
						removeProject(project.id);
						projects.splice(projects.indexOf(project), 1);
					}
				}}
			>
				<IconTrashCan class="size-8" />
			</button>
		</div>
	</li>
{/snippet}
