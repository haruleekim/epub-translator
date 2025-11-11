<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { nanoid } from "nanoid";
	import TranslationList from "$lib/components/TranslationList.svelte";
	import { Partition } from "$lib/core/dom";
	import type { Translation } from "$lib/core/project";
	import original from "$lib/data/sample.original.xhtml?raw";
	import translated from "$lib/data/sample.translated.xhtml?raw";

	const translations: Translation[] = Array.from({ length: 10 }).map((_, i) => ({
		id: nanoid(),
		path: "OEBPS/chapter1.xhtml",
		partition: Partition.parse(`0/1/${((i * 3) % 10) + 1}-${((i * 3) % 10) + 3}`),
		original,
		translated,
		createdAt: new Date(Date.now() + i * 1000),
	}));
	const { Story } = defineMeta({
		component: TranslationList,
		args: { translations, onSelectionChange: (trs) => console.log(trs) },
	});
</script>

<Story name="Default" />
