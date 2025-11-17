<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import IconAddCircleOutline from "virtual:icons/mdi/add-circle-outline";
	import IconChevronDown from "virtual:icons/mdi/chevron-down";
	import IconChevronRight from "virtual:icons/mdi/chevron-right";
	import IconClipboardOutline from "virtual:icons/mdi/clipboard-outline";
	import IconEditOutline from "virtual:icons/mdi/edit-outline";
	import IconTrashCanOutline from "virtual:icons/mdi/trash-can-outline";
	import TranslationDiff from "$lib/components/TranslationDiff.svelte";
	import { getWorkspaceContext } from "$lib/context.svelte";
	import { Partition } from "$lib/core/dom";

	const props: { class?: ClassValue | null } = $props();
	const cx = getWorkspaceContext();

	const translations = $derived.by(() => {
		let translations = cx.project
			.translationsForPath(cx.path)
			.sort((a, b) => Partition.totalOrderCompare(a.partition, b.partition));
		if (cx.partition) {
			const partition = cx.partition;
			translations = translations.filter((t) => !Partition.compare(t.partition, partition));
		}
		return translations;
	});

	const folds = $state<Record<string, boolean>>({});
</script>

<ul class={["list", props.class]}>
	{#if cx.partition}
		<li class="list-row">
			<button
				class="list-col-grow btn btn-outline btn-sm"
				onclick={() => {
					cx.popup = {
						mode: "edit-translation",
						translation: null,
					};
				}}
			>
				<IconAddCircleOutline class="size-4" />
				Translation
			</button>
		</li>
	{/if}
	{#each translations as translation (translation.id)}
		{@const { id, original, translated, createdAt } = translation}
		<li class="list-row items-center gap-y-2 rounded-sm p-2">
			<button class="h-full hover:cursor-pointer" onclick={() => (folds[id] = !folds[id])}>
				{#if folds[id]}
					<IconChevronDown class="size-5" />
				{:else}
					<IconChevronRight class="size-5" />
				{/if}
			</button>

			<button
				class="text-justify hover:cursor-pointer"
				onclick={() => (folds[id] = !folds[id])}
			>
				{createdAt.toLocaleString()}
			</button>

			<div
				class="tooltip text-xs [&:has(*:focus)]:tooltip-success [&:has(*:focus)]:before:content-['Copied!']"
				data-tip="Copy Translated Text"
			>
				<button
					class="btn btn-circle btn-ghost btn-xs focus:btn-success"
					onclick={async () => {
						await navigator.clipboard.writeText(translated);
					}}
				>
					<IconClipboardOutline class="size-4" />
				</button>
			</div>

			<div class="tooltip text-xs" data-tip="Edit">
				<button
					class="btn btn-circle btn-ghost btn-xs"
					onclick={() => {
						cx.popup = {
							mode: "edit-translation",
							translation,
						};
					}}
				>
					<IconEditOutline class="size-4" />
				</button>
			</div>

			<div class="tooltip text-xs tooltip-error" data-tip="Delete">
				<button
					class="btn btn-circle btn-ghost btn-xs hover:btn-error"
					onclick={async () => {
						if (confirm("Are you sure you want to delete this translation?")) {
							cx.project.removeTranslation(translation.id);
							await cx.project.save();
						}
					}}
				>
					<IconTrashCanOutline class="size-4" />
				</button>
			</div>

			<div class="tooltip tooltip-left text-xs" data-tip="Toggle Active">
				<input
					class="checkbox checkbox-xs"
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
			</div>

			{#if folds[id]}
				<div class="col-span-6 col-start-1 row-start-2 rounded bg-base-200 p-1 text-xs">
					<svelte:boundary>
						<TranslationDiff class="w-full" {original} {translated} />
						{#snippet pending()}
							<div class="h-16 w-full skeleton"></div>
						{/snippet}
					</svelte:boundary>
				</div>
			{/if}
		</li>
	{/each}
</ul>
