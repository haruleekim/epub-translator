<script lang="ts">
	import type { Snippet } from "svelte";
	import type { ClassValue } from "svelte/elements";
	import IconChevronDown from "virtual:icons/mdi/chevron-down";
	import IconChevronRight from "virtual:icons/mdi/chevron-right";
	import { Partition } from "$lib/core/dom";
	import type { Translation } from "$lib/project";
	import TranslationDiff from "./TranslationDiff.svelte";

	type Props = {
		translations: Translation[];
		selectedIds: string[];
		onSelectionChange?: (translationIds: string[]) => void;
		itemSnippet?: Snippet<[Translation]>;
		class?: ClassValue | null;
	};
	const props: Props = $props();

	const items = $derived(
		props.translations
			.toSorted((a, b) => Partition.totalOrderCompare(a.partition, b.partition))
			.map((tr) => [tr, props.selectedIds.includes(tr.id)] as const),
	);

	const folds = $state<Record<string, boolean>>({});
</script>

<ul class={["list", props.class]}>
	{#each items as [translation, selected] (translation.id)}
		{@const { id, path, partition, original, translated, createdAt } = translation}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<li
			class="list-row items-center hover:cursor-pointer hover:bg-base-300"
			onclick={(evt) => {
				if (evt.target instanceof HTMLInputElement) return;
				folds[id] = !folds[id];
			}}
		>
			<div>
				{#if folds[id]}
					<IconChevronDown class="size-6" />
				{:else}
					<IconChevronRight class="size-6" />
				{/if}
			</div>
			<div>
				<div>{id}</div>
				<div class="text-sm text-base-content/75">{path} · {partition}</div>
				<div class="text-sm text-base-content/75">{createdAt.toLocaleString()}</div>
			</div>
			<div class="col-span-2 list-col-wrap rounded bg-base-200 p-2" hidden={!folds[id]}>
				<TranslationDiff class="w-full" {original} {translated} />
			</div>
			<div>
				{@render props.itemSnippet?.(translation)}
			</div>
			<input
				class="checkbox"
				type="checkbox"
				checked={selected}
				onchange={(event) => {
					let selectedIds: string[];
					if (event.currentTarget.checked) {
						selectedIds = [...props.selectedIds, id];
					} else {
						selectedIds = props.selectedIds.filter((sid) => sid !== id);
					}
					props.onSelectionChange?.(selectedIds);
				}}
			/>
		</li>
	{/each}
</ul>
