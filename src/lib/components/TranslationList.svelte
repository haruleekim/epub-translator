<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import IconChevronDown from "virtual:icons/mdi/chevron-down";
	import IconChevronRight from "virtual:icons/mdi/chevron-right";
	import { Partition } from "$lib/core/dom";
	import type { Translation } from "$lib/core/project";
	import TranslationDiff from "./TranslationDiff.svelte";

	type Props = {
		translations: Translation[];
		onSelectionChange?: (translations: Translation[]) => void;
		class?: ClassValue | null;
	};
	const props: Props = $props();

	const translations = $derived(
		props.translations.toSorted((a, b) =>
			Partition.totalOrderCompare(a.partition, b.partition),
		),
	);

	const folds = $state<Record<string, boolean>>({});
	const selects = $state<Record<string, boolean>>({});

	$effect(() => {
		const selectedTranslations = translations.filter((t) => selects[t.id]);
		props.onSelectionChange?.(selectedTranslations);
	});
</script>

<ul class={["list", props.class]}>
	{#each translations as { id, path, partition, original, translated, createdAt } (id)}
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
			<div class="list-col-wrap rounded bg-base-200 p-2" hidden={!folds[id]}>
				<TranslationDiff class="w-full" {original} {translated} />
			</div>
			<input
				class="checkbox"
				type="checkbox"
				value={selects[id]}
				onchange={() => (selects[id] = !selects[id])}
			/>
		</li>
	{/each}
</ul>
