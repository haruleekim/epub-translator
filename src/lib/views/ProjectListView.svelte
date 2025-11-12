<script lang="ts">
	import IconAddCircleOutline from "virtual:icons/mdi/add-circle-outline";
	import IconArrowRightThin from "virtual:icons/mdi/arrow-right-thin";
	import IconTrashCan from "virtual:icons/mdi/trash-can";
	import { resolve } from "$app/paths";
	import { getContext } from "$lib/context.svelte";
	import Project from "$lib/project";
	import { getLanguage } from "$lib/utils/languages";
	import ProjectCreationDialog from "$lib/views/ProjectCreationDialog.svelte";

	const cx = getContext();

	let dialogOpen = $state(false);

	await cx.reloadAllProjects();
</script>

{#if dialogOpen}
	<ProjectCreationDialog
		bind:open={dialogOpen}
		onCreate={async (project) => {
			cx.projects.set(project.id, project);
			await cx.saveProject(project.id);
			dialogOpen = false;
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
		{#each cx.projects as [id, project] (id)}
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
			<div class="flex items-center gap-2 text-base-content/75">
				<div>{getLanguage(project.sourceLanguage)?.name}</div>
				<IconArrowRightThin class="size-8" />
				<div>{getLanguage(project.targetLanguage)?.name}</div>
			</div>
		</a>
		<div class="ml-4 flex items-center">
			<button
				class="btn btn-circle btn-soft btn-error"
				onclick={async () => {
					if (confirm("Are you sure you want to delete this project?")) {
						cx.removeProject(project.id);
					}
				}}
			>
				<IconTrashCan class="size-8" />
			</button>
		</div>
	</li>
{/snippet}
