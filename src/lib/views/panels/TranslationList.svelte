<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import IconChevronDown from "virtual:icons/mdi/chevron-down";
	import IconChevronRight from "virtual:icons/mdi/chevron-right";
	import IconTrashCan from "virtual:icons/mdi/trash-can";
	import TranslationDiff from "$lib/components/TranslationDiff.svelte";
	import { getWorkspaceContext } from "$lib/context.svelte";
	import { Partition } from "$lib/core/dom";

	const props: { class?: ClassValue | null } = $props();
	const cx = getWorkspaceContext();

	const translations = $derived(
		cx.project
			.translationsForPath(cx.path)
			.toSorted((a, b) => Partition.totalOrderCompare(a.partition, b.partition)),
	);

	const folds = $state<Record<string, boolean>>({});
</script>

<ul class={["list", props.class]}>
	{#each translations as translation (translation.id)}
		{@const { id, path, partition, original, translated, createdAt } = translation}
		<li class="list-row items-center hover:bg-base-300">
			<button
				class="h-full hover:cursor-pointer"
				onclick={() => (folds[id] = !folds[id])}
				aria-label="Toggle details"
			>
				{#if folds[id]}
					<IconChevronDown class="size-6" />
				{:else}
					<IconChevronRight class="size-6" />
				{/if}
			</button>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div onclick={() => (folds[id] = !folds[id])}>
				<div>{id}</div>
				<div class="text-sm text-base-content/75">{path} · {partition}</div>
				<div class="text-sm text-base-content/75">{createdAt.toLocaleString()}</div>
			</div>
			{#if folds[id]}
				<div class="col-span-2 list-col-wrap rounded bg-base-200 p-2">
					<TranslationDiff class="w-full" {original} {translated} />
				</div>
			{/if}
			<div>
				<button
					class="btn btn-circle btn-ghost btn-error"
					onclick={async () => {
						if (confirm("Are you sure you want to delete this translation?")) {
							cx.project.removeTranslation(translation.id);
							await cx.project.save();
						}
					}}
				>
					<IconTrashCan class="size-6" />
				</button>
			</div>
			<input
				class="checkbox"
				type="checkbox"
				checked={cx.project.activeTranslationIds.has(id)}
				onchange={async (event) => {
					if (event.currentTarget.checked) {
						cx.project.activeTranslationIds.add(id);
					} else {
						cx.project.activeTranslationIds.delete(id);
					}
					await cx.project.save();
				}}
			/>
		</li>
	{/each}
</ul>
