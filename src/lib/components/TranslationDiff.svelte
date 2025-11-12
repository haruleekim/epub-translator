<script lang="ts">
	import * as Diff from "diff";
	import type { ClassValue } from "svelte/elements";
	import { fade } from "svelte/transition";
	import { Dom } from "$lib/core/dom";

	type Props = { original: string; translated: string; class?: ClassValue | null };
	const props: Props = $props();

	function tokenize(dom: Dom, text: string): string[] {
		const tokens: string[] = [];
		for (const { node, open } of dom.iterate()) {
			let start: number, end: number;
			if ("children" in node && node.children.length > 0) {
				if (open) {
					start = node.startIndex!;
					end = node.firstChild!.startIndex!;
				} else {
					start = node.lastChild!.endIndex! + 1;
					end = node.endIndex! + 1;
				}
				tokens.push(text.slice(start, end));
			} else if (open) {
				tokens.push(text.slice(node.startIndex!, node.endIndex! + 1));
			}
		}
		return tokens;
	}

	const originalPromise = $derived(
		Dom.loadAsync(props.original).then((dom) => tokenize(dom, props.original)),
	);
	const translatedPromise = $derived(
		Dom.loadAsync(props.translated).then((dom) => tokenize(dom, props.translated)),
	);

	const diffs = $derived.by(async () => {
		const [original, translated] = await Promise.all([originalPromise, translatedPromise]);
		return new Promise<Diff.ChangeObject<string[]>[]>((resolve) => {
			Diff.diffArrays(original, translated, resolve);
		});
	});
</script>

<div class={["relative", props.class]}>
	<code class="absolute top-0 left-0 flex-1 text-xs leading-normal whitespace-pre-wrap">
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
	{#await diffs}
		<div
			class="sticky top-0 left-0 flex h-full w-full items-center justify-center p-4"
			transition:fade
		>
			<div class="loading loading-lg loading-spinner"></div>
		</div>
	{/await}
</div>
