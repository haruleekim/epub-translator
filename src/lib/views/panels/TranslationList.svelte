<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import { slide } from "svelte/transition";
	import IconAddCircleOutline from "virtual:icons/mdi/add-circle-outline";
	import IconClipboardOutline from "virtual:icons/mdi/clipboard-outline";
	import IconEditOutline from "virtual:icons/mdi/edit-outline";
	import IconMerge from "virtual:icons/mdi/merge";
	import IconTrashCanOutline from "virtual:icons/mdi/trash-can-outline";
	import TranslationDiff from "$lib/components/TranslationDiff.svelte";
	import { getWorkspaceContext } from "$lib/context.svelte";
	import { Partition } from "$lib/core/dom";

	const props: { class?: ClassValue | null } = $props();
	const cx = getWorkspaceContext();

	const translations = $derived.by(() => {
		return cx.project
			.translationsForPath(cx.path)
			.sort((a, b) => Partition.totalOrderCompare(a.partition, b.partition));
	});

	const folds = $state<Record<string, boolean>>({});

	const checks = $state<Record<string, boolean>>({});
	const checkedTranslations = $derived.by(() => {
		return translations.filter((t) => checks[t.id]);
	});
</script>

<ul class={["list", props.class]}>
	<li class="list-row gap-1">
		<div class="list-col-grow grid w-full grid-flow-col grid-cols-3 gap-1">
			<button
				class="btn text-nowrap btn-soft btn-xs btn-error"
				disabled={!checkedTranslations.length}
				onclick={async () => {
					if (
						confirm(
							`Are you sure you want to delete ${checkedTranslations.length} selected translation(s)?`,
						)
					) {
						for (const translation of checkedTranslations) {
							cx.project.removeTranslation(translation.id);
						}
						await cx.project.save();
					}
				}}
			>
				<IconTrashCanOutline class="size-4" />
				Delete
			</button>
			<button
				class="btn text-nowrap btn-soft btn-xs btn-warning"
				disabled={checkedTranslations.length < 2}
				onclick={() => {
					cx.popup = {
						mode: "merge-translations",
						translationIds: checkedTranslations.map((t) => t.id),
					};
				}}
			>
				<IconMerge class="size-4" />
				Merge
			</button>
			<button
				class="btn text-nowrap btn-soft btn-xs btn-success"
				disabled={!cx.partition}
				onclick={() => {
					cx.popup = { mode: "edit-translation", translation: null };
				}}
			>
				<IconAddCircleOutline class="size-4" />
				Add
			</button>
		</div>
	</li>

	{#each translations as translation (translation.id)}
		{@const { id, original, translated, createdAt, partition } = translation}
		<li
			class={[
				"list-row items-center gap-y-2 rounded-sm p-2",
				cx.partition && !Partition.compare(partition, cx.partition) && "bg-base-200",
			]}
			transition:slide
		>
			<input class="checkbox checkbox-xs" type="checkbox" bind:checked={checks[id]} />

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

			<input
				class="toggle toggle-xs"
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

			{#if folds[id]}
				<div class="col-span-6 col-start-1 row-start-2 rounded p-1 text-xs">
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
