<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import TranslationDiff from "$lib/components/TranslationDiff.svelte";
	import original from "$lib/data/sample.original.xhtml?raw";
	import translated from "$lib/data/sample.translated.xhtml?raw";

	const { Story } = defineMeta({
		component: TranslationDiff,
		args: { original, translated },
	});
</script>

<Story name="Default" />
