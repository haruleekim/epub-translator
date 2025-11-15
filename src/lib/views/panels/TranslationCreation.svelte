<script lang="ts">
	import { SSE } from "sse.js";
	import type { ClassValue } from "svelte/elements";
	import { resolve } from "$app/paths";
	import TranslationDiff from "$lib/components/TranslationDiff.svelte";
	import { getWorkspaceContext } from "$lib/context.svelte";
	import defaultPromptTemplate from "$lib/data/default-prompt.template.txt?raw";
	import { saveProject } from "$lib/database";

	const props: { class?: ClassValue | null } = $props();

	const cx = getWorkspaceContext();

	const originalPromise = $derived.by(async () => {
		if (!cx.partition) return null;
		return cx.project.getOriginalContent(cx.path, cx.partition);
	});
	const original = $derived(await originalPromise);
	let translated = $state("");

	const defaultPrompt = $derived(defaultPromptTemplate.replaceAll("{{lang}}", "Korean"));

	async function handleGenerateTranslation(this: HTMLFormElement, event: SubmitEvent) {
		event.preventDefault();

		try {
			cx.locked = true;

			const form = new FormData(this);
			const instructions = form.get("prompt");
			if (typeof instructions !== "string") throw new Error("Invalid prompt");
			if (!original) throw new Error("Original text is empty");

			const sse = new SSE(resolve("/api/llm"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				payload: JSON.stringify({ instructions, input: original }),
			});
			await new Promise((resolve, reject) => {
				sse.addEventListener("open", () => (translated = ""));
				sse.addEventListener("error", reject);
				sse.addEventListener("message", (event: { data: string }) => {
					translated += JSON.parse(event.data);
				});
				sse.addEventListener("done", () => {
					sse.close();
					resolve(void 0);
				});
			});
		} finally {
			cx.locked = false;
		}
	}

	async function handleAddTranslation(this: HTMLFormElement, event: SubmitEvent) {
		event.preventDefault();
		if (!translated) return;
		if (!cx.partition) return;
		const translationId = cx.project.addTranslation(
			cx.path,
			cx.partition,
			await cx.project.getOriginalContent(cx.path, cx.partition),
			translated,
		);
		cx.project.activeTranslationIds.add(translationId);
		cx.mode = "list-translations";
		await saveProject(cx.project);
	}
</script>

<div class={props.class}>
	<div>
		<label class="">
			<input type="checkbox" hidden />
			<div class="max-h-40 overflow-y-auto [input[type=checkbox]:checked+&]:max-h-none">
				{#if translated && original && !cx.locked}
					<TranslationDiff {original} {translated} />
				{:else}
					<code class="text-xs leading-normal whitespace-pre-wrap">
						{original}
					</code>
				{/if}
			</div>
		</label>
	</div>

	<div class="divider"></div>

	<form onsubmit={handleGenerateTranslation}>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Generate translation from LLM</legend>
			<textarea
				class="textarea w-full textarea-xs"
				name="prompt"
				placeholder="Prompt"
				required
				defaultValue={defaultPrompt}
			></textarea>
			<button type="submit" class="btn ml-auto flex btn-xs" disabled={cx.locked || !original}>
				Generate
			</button>
		</fieldset>
	</form>

	<form onsubmit={handleAddTranslation}>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Translation</legend>
			<textarea
				class="textarea w-full textarea-xs"
				placeholder="Translation"
				required
				disabled={cx.locked}
				bind:value={translated}
			></textarea>
			<div class="label"></div>
			<button
				class="btn btn-sm btn-primary"
				type="submit"
				disabled={cx.locked || !original || !translated}
			>
				Add Translation
			</button>
		</fieldset>
	</form>
</div>
