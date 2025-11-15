<script lang="ts">
	import { tick } from "svelte";
	import type { ClassValue } from "svelte/elements";
	import { blur } from "svelte/transition";
	import IconClose from "virtual:icons/mdi/close";
	import IconError from "virtual:icons/mdi/error";
	import Epub from "$lib/core/epub";
	import defaultPromptTemplate from "$lib/data/default-prompt.template.txt?raw";
	import Project from "$lib/project.svelte";

	type Props = {
		open?: boolean;
		onCreate?: (project: Project) => void | Promise<void>;
		class?: ClassValue | null | undefined;
	};

	let { open = $bindable(false), onCreate, class: classValue }: Props = $props();

	let epub = $state<Promise<Epub>>();
	let creating = $state(false);
	let errorMessage = $state<string | null>(null);

	let defaultPromptInput = $state<HTMLTextAreaElement>();
</script>

<dialog class={["modal", classValue]} {open} transition:blur={{ duration: 150 }}>
	<form
		class="modal-box"
		onsubmit={async (event) => {
			event.preventDefault();
			if (creating || !defaultPromptInput?.value) return;
			creating = true;
			try {
				const project = Project.create((await epub)!, defaultPromptInput.value);
				await onCreate?.(project);
			} catch (error: any) {
				errorMessage = error?.message ?? "Unknown error";
			} finally {
				creating = false;
			}
		}}
	>
		<div class="mb-4 text-lg leading-4 font-bold">Create Project</div>

		<button
			type="button"
			class="btn absolute top-4 right-4 btn-circle btn-xs hover:text-error-content hover:btn-error"
			onclick={() => (open = false)}
		>
			<IconClose class="size-4" />
		</button>

		{#if errorMessage}
			<div role="alert" class="mb-4 alert alert-error">
				<IconError class="size-6" />
				<span>{errorMessage}</span>
			</div>
		{/if}

		<fieldset class="fieldset">
			{#if epub}
				{#await epub}
					<div role="status" class="loading mx-auto my-1 block loading-spinner"></div>
				{:then epub}
					<div class="flex gap-2 overflow-clip rounded">
						<img
							src={await epub.getCoverImage()?.getUrl()}
							alt="cover"
							class="max-w-16"
						/>
						<div class="p-1">
							<div class="text-lg">
								{epub.title}
							</div>
							<div class="text-sm font-semibold text-base-content/60">
								{epub.author}
							</div>
						</div>
					</div>
				{/await}
			{/if}

			<input
				type="file"
				accept="application/epub+zip"
				class="file-input w-full"
				onchange={(event) => {
					const file = event.currentTarget.files?.item(0) ?? undefined;
					if (file) {
						epub = Epub.load(file);
						epub.then(async () => {
							await tick();
							defaultPromptInput?.focus();
						}).catch((error: any) => {
							errorMessage = error?.message ?? "Failed to load EPUB";
						});
					} else {
						epub = undefined;
					}
				}}
			/>
		</fieldset>

		<fieldset class="fieldset" hidden={!(await epub)}>
			<label class="contents">
				<span class="label">Prompt</span>
				<textarea
					class="textarea field-sizing-content w-full resize-none textarea-xs"
					bind:this={defaultPromptInput}
					name="default-prompt"
					required
					spellcheck={false}
					defaultValue={defaultPromptTemplate}
				></textarea>
			</label>
		</fieldset>

		<div class="modal-action">
			<button type="submit" class="btn btn-outline btn-primary" disabled={!(await epub)}>
				{#if creating}
					<span class="loading loading-spinner"></span>
				{/if}
				Create
			</button>
		</div>
	</form>

	<button class="modal-backdrop cursor-pointer" onclick={() => (open = false)}>close</button>
</dialog>
