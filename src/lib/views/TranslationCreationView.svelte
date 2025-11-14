<script lang="ts">
	import OpenAI from "openai";
	import type { ClassValue } from "svelte/elements";
	import TranslationDiff from "$lib/components/TranslationDiff.svelte";
	import defaultPromptTemplate from "$lib/data/default-prompt.template.txt?raw";
	import { getLanguage } from "$lib/utils/languages";

	let {
		translated = $bindable(),
		...props
	}: {
		original: Promise<string>;
		translated?: string;
		targetLanguage: string;
		onTranslationAdd?: (translated: string) => void;
		onPartitionLockChange?: (locked: boolean) => void;
		class?: ClassValue | null;
	} = $props();

	const defaultPrompt = $derived(
		defaultPromptTemplate.replaceAll(
			"{{lang}}",
			getLanguage(props.targetLanguage)?.name ?? "English",
		),
	);

	let generating = $state(false);

	async function handleGenerateTranslation(this: HTMLFormElement, event: SubmitEvent) {
		event.preventDefault();

		try {
			props.onPartitionLockChange?.(true);
			generating = true;

			const form = new FormData(this);
			const instructions = form.get("prompt");
			if (typeof instructions !== "string") throw new Error("Invalid prompt");
			if (!(await props.original)) throw new Error("Original text is empty");

			const openai = new OpenAI({
				apiKey: import.meta.env.VITE_OPENAI_API_KEY,
				dangerouslyAllowBrowser: true,
			});
			const stream = await openai.responses.create({
				model: "gpt-4o",
				instructions,
				input: await props.original,
				stream: true,
			});

			translated = "";
			let chunk = "";
			for await (const event of stream) {
				if (event.type === "response.output_text.delta") {
					chunk += event.delta;
					if (chunk.length > 10) {
						translated += chunk;
						chunk = "";
					}
				}
			}
			translated += chunk;
		} finally {
			generating = false;
			props.onPartitionLockChange?.(false);
		}
	}

	async function handleAddTranslation(this: HTMLFormElement, event: SubmitEvent) {
		event.preventDefault();
		if (!translated) return;
		props.onTranslationAdd?.(translated);
	}
</script>

<div class={props.class}>
	<div>
		<label class="">
			<input type="checkbox" hidden />
			<div class="max-h-40 overflow-y-auto [input[type=checkbox]:checked+&]:max-h-none">
				{#if translated && !generating}
					<TranslationDiff
						original={await props.original}
						translated={translated ?? ""}
					/>
				{:else}
					<code class="text-xs leading-normal whitespace-pre-wrap">
						{await props.original}
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
			<button
				type="submit"
				class="btn ml-auto flex btn-xs"
				disabled={generating || !(await props.original)}
			>
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
				disabled={generating}
				bind:value={translated}
			></textarea>
			<div class="label"></div>
			<button
				class="btn btn-sm btn-primary"
				type="submit"
				disabled={generating || !(await props.original)}
			>
				Add Translation
			</button>
		</fieldset>
	</form>
</div>
