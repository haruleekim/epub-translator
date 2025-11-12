<script lang="ts">
	import * as Diff from "diff";
	import type { ClassValue } from "svelte/elements";
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
