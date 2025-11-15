<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { nanoid } from "nanoid";
	import TranslationList from "$lib/components/TranslationList.svelte";
	import { Partition } from "$lib/core/dom";
	import original from "$lib/data/sample.original.xhtml?raw";
	import translated from "$lib/data/sample.translated.xhtml?raw";
	import type { Translation } from "$lib/translation";

	const translations: Translation[] = Array.from({ length: 10 }).map((_, i) => ({
		id: nanoid(),
		path: "OEBPS/chapter1.xhtml",
		partition: Partition.parse(`0/1/${((i * 3) % 10) + 1}-${((i * 3) % 10) + 3}`),
		original,
		translated,
		createdAt: new Date(Date.now() + i * 1000),
	}));

	const selectedIds = $state([translations[0].id, translations[2].id]);

	const { Story } = defineMeta({ component: TranslationList });
</script>

{#snippet itemSnippet({ partition }: Translation)}
	{@const index = ((partition.first.leafOrder! - 1) * 7) % 10}
	<span
		class={[
			"badge badge-sm",
			["badge-primary", "badge-secondary", "badge-success", "badge-warning", "badge-error"][
				index % 5
			],
		]}>Part {index}</span
	>
{/snippet}

<Story
	name="Default"
	args={{
		translations,
		onSelectionChange: console.log,
		selectedIds,
		itemSnippet,
	}}
/>
