<script lang="ts">
	import * as Diff from "diff";
	import type { ClassValue } from "svelte/elements";
	import { Dom } from "$lib/core/dom";

	type Props = { original: string; translated: string; class?: ClassValue | null };
	const props: Props = $props();

	function tokenize(dom: Dom): string[] {
		return dom.tokenize().map(({ content }) => content);
	}

	const originalPromise = $derived(Dom.loadAsync(props.original).then(tokenize));
	const translatedPromise = $derived(Dom.loadAsync(props.translated).then(tokenize));

	let timeoutId: ReturnType<typeof setTimeout>;
	const diffs = $derived.by(async () => {
		const [original, translated] = await Promise.all([originalPromise, translatedPromise]);
		return new Promise<Diff.ChangeObject<string[]>[]>((resolve) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => Diff.diffArrays(original, translated, resolve));
		});
	});
</script>

<code class={["text-xs leading-normal whitespace-pre-wrap", props.class]}>
	{#each await diffs as diff (diff)}
		{@const text = diff.value.join("")}
		{#if diff.added}
			<span class="bg-success text-success-content">{text}</span>
		{:else if diff.removed}
			<span class="bg-error text-error-content">{text}</span>
		{:else}
			<span class="text-base-content">{text}</span>
		{/if}
	{/each}
</code>
