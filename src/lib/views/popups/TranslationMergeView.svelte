<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import { fade } from "svelte/transition";
	import TranslationDiff from "$lib/components/TranslationDiff.svelte";
	import { getWorkspaceContext } from "$lib/context.svelte";

	const props: { class?: ClassValue | null } = $props();
	const cx = getWorkspaceContext();

	const popup = $derived.by(() => {
		if (cx.popup?.mode !== "merge-translations") throw new Error("Invalid popup mode");
		return cx.popup;
	});

	const substitution = $derived(cx.project.mergeTranslations(cx.path, popup.translationIds));

	let translated = $derived(substitution?.then((substitution) => substitution.content));
	let original = $derived.by(async () => {
		const [project, path] = [cx.project, cx.path];
		return substitution?.then((substitution) => {
			return project.getOriginalContent(path, substitution.partition);
		});
	});
</script>

<div class={props.class} out:fade>
	{#await substitution}
		<div class="h-40 w-full skeleton"></div>
	{:then substitution}
		<form
			onsubmit={async (event) => {
				event.preventDefault();
				const id = cx.project.addTranslation(
					cx.path,
					substitution.partition,
					await original,
					await translated,
				);
				cx.project.activeTranslationIds.add(id);
				for (const id of popup.translationIds) {
					cx.project.removeTranslation(id);
				}
				cx.panelMode = "list-translations";
				cx.popup = null;
				await cx.project.save();
			}}
		>
			<div class="text-lg font-bold">Merge Translations</div>
			<fieldset class="mt-4 fieldset">
				<TranslationDiff
					class="block"
					original={await original}
					translated={await translated}
				/>
				<button type="submit" class="btn mt-4 btn-primary">Confirm</button>
			</fieldset>
		</form>
	{:catch}
		<div>
			<h1 class="mb-2 text-lg font-bold">These translations cannot be merged</h1>
			<p class="text-sm">
				Please ensure that the selected translations do not have conflicting changes in the
				same depth.
			</p>
			<button
				class="btn mt-4 btn-block btn-sm btn-secondary"
				onclick={() => (cx.popup = null)}
			>
				Close
			</button>
		</div>
	{/await}
</div>
