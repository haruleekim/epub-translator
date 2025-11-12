<script lang="ts">
	import OpenAI from "openai";
	import type { ClassValue } from "svelte/elements";
	import defaultPromptTemplate from "$lib/data/default-prompt.template.txt?raw";
	import { getLanguage } from "$lib/utils/languages";

	let {
		translated = $bindable(),
		...props
	}: {
		original: Promise<string>;
		translated?: string;
		targetLanguage: string;
		onTranslationAdd?: () => void;
		class?: ClassValue | null;
	} = $props();

	const defaultPrompt = $derived(
		defaultPromptTemplate.replaceAll(
			"{{lang}}",
			getLanguage(props.targetLanguage)?.name ?? "English",
		),
	);

	let translationInput = $state<HTMLTextAreaElement>();

	async function handleGenerateTranslation(this: HTMLFormElement, event: SubmitEvent) {
		event.preventDefault();
		if (!translationInput) return;

		const form = new FormData(this);
		const instructions = form.get("prompt");
		if (typeof instructions !== "string") throw new Error("Invalid prompt");

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

		translationInput.disabled = true;
		translated = "";
		for await (const event of stream) {
			if (event.type === "response.output_text.delta") {
				translated += event.delta;
			}
		}
		translationInput.disabled = false;
	}

	async function handleAddTranslation(this: HTMLFormElement, event: SubmitEvent) {
		event.preventDefault();
		if (!translationInput) return;
		props.onTranslationAdd?.();
	}
</script>

<div class={["flex h-full flex-col", props.class]}>
	<form onsubmit={handleGenerateTranslation}>
		<fieldset class="fieldset flex flex-col">
			<legend class="fieldset-legend">Generate translation from LLM</legend>
			<textarea
				class="textarea h-fit w-full textarea-xs"
				name="prompt"
				placeholder="Prompt"
				defaultValue={defaultPrompt}
			></textarea>
			<button type="submit" class="btn ml-auto flex btn-sm"> Generate </button>
		</fieldset>
	</form>

	<form onsubmit={handleAddTranslation} class="flex-1">
		<fieldset class="fieldset flex h-full flex-col">
			<legend class="fieldset-legend">Translation</legend>
			<textarea
				class="textarea w-full flex-1 textarea-xs"
				placeholder="Translation"
				required
				bind:this={translationInput}
				bind:value={translated}
			></textarea>
			<div class="label"></div>
			<button class="btn btn-primary" type="submit">Add Translation</button>
		</fieldset>
	</form>
</div>
