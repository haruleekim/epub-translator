<script lang="ts">
	import { SSE } from "sse.js";
	import type { ClassValue } from "svelte/elements";
	import { fade } from "svelte/transition";
	import { resolve } from "$app/paths";
	import TranslationDiff from "$lib/components/TranslationDiff.svelte";
	import { getWorkspaceContext } from "$lib/context.svelte";

	const props: { class?: ClassValue | null } = $props();
	const cx = getWorkspaceContext();

	const translation = $derived.by(() => {
		if (cx.popup?.mode !== "edit-translation") return null;
		return cx.popup.translation;
	});

	const original = $derived.by(() => {
		if (translation) return translation.original;
		return cx.partition && cx.project.getOriginalContent(cx.path, cx.partition);
	});

	let translated = $derived.by(() => {
		if (translation) return translation.translated;
		return "";
	});

	async function handleGenerateTranslation(this: HTMLFormElement, event: SubmitEvent) {
		event.preventDefault();

		try {
			cx.locked = true;

			const form = new FormData(this);
			const additionalPrompt = form.get("prompt");
			if (typeof additionalPrompt !== "string") throw new Error("Invalid prompt");
			if (!original) throw new Error("Original text is empty");

			let instructions = cx.project.defaultPrompt;
			if (additionalPrompt.trim() !== "") instructions += `\n\n${additionalPrompt}`;

			const sse = new SSE(resolve("/api/llm"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				payload: JSON.stringify({ instructions, input: await original }),
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

	async function handleConfirm(this: HTMLFormElement, event: SubmitEvent) {
		event.preventDefault();
		if (translation) {
			cx.project.updateTranslation(translation.id, translated);
		} else {
			if (!translated) return;
			if (!cx.partition) return;
			const translationId = cx.project.addTranslation(
				cx.path,
				cx.partition,
				await cx.project.getOriginalContent(cx.path, cx.partition),
				translated,
			);
			cx.project.activeTranslationIds.add(translationId);
		}
		cx.panelMode = "list-translations";
		await cx.project.save();
		cx.popup = null;
	}
</script>

<div class={props.class} out:fade>
	<form onsubmit={handleGenerateTranslation}>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Generate translation from LLM</legend>
			<textarea
				class="textarea field-sizing-content min-h-8 w-full textarea-xs"
				name="prompt"
				placeholder="Additional prompt (optional)"
				spellcheck={false}
			></textarea>
			<button
				type="submit"
				class="btn ml-auto flex btn-soft btn-xs"
				disabled={cx.locked || !original}
			>
				Generate
			</button>
		</fieldset>
	</form>

	<form onsubmit={handleConfirm}>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Translation</legend>
			<textarea
				class="textarea field-sizing-content w-full textarea-xs"
				placeholder="Enter translated text here..."
				spellcheck={false}
				required
				disabled={cx.locked}
				bind:value={translated}
			></textarea>
			<div class="label"></div>

			<div class="my-2 border-y-2 border-base-200 py-2 text-xs">
				{#if translated && original && !cx.locked}
					<TranslationDiff original={await original} {translated} />
				{:else}
					<code class="text-xs leading-normal whitespace-pre-wrap">
						{await original}
					</code>
				{/if}
			</div>

			<button
				class="btn btn-sm btn-primary"
				type="submit"
				disabled={cx.locked || !original || !translated}
			>
				{#if translation}
					Save Changes
				{:else}
					Add Translation
				{/if}
			</button>
		</fieldset>
	</form>
</div>
