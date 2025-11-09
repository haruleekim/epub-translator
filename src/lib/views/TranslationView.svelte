<script lang="ts">
	import type { Partition } from "$lib//core/common";
	import type Project from "$lib/core/project";
	import { translateByOpenAI } from "$lib/openai";

	type Props = {
		project: Project;
		path: string;
		partition?: Partition;
	};
	const { project: projectProp, path, partition }: Props = $props();

	let project = $derived.by(() => {
		projectProp;
		return () => projectProp;
	});
	function refreshProject() {
		project = () => projectProp;
	}

	const selectionFlags = $state<Record<string, boolean>>({});
	const selectedIds = $derived(
		Object.entries(selectionFlags)
			.filter(([, v]) => v)
			.map(([k]) => k),
	);

	let translations = $derived(project().listTranslations(path));
	let overlaps: Promise<boolean> = $derived(project().checkOverlaps(selectedIds));
	let previewContent: Promise<string> = $derived(
		project().renderTranslatedContent(path, selectedIds),
	);

	let loading = $state(false);
</script>

<div>
	{#if partition}
		<div>
			<div>{partition}</div>
			<pre class="text-xs whitespace-pre-wrap text-base-content/50">
                {await project().getOriginalContent(path, partition)}
            </pre>
			<div>
				<button
					class="btn btn-sm btn-primary"
					onclick={async () => {
						loading = true;
						await translateByOpenAI(project(), path, partition, {
							apiKey: import.meta.env.VITE_OPENAI_API_KEY,
							dangerouslyAllowBrowser: true,
						}).finally(() => (loading = false));
						refreshProject();
					}}
				>
					{#if loading}
						<span class="loading loading-spinner"></span>
					{/if}
					Translate
				</button>
			</div>
		</div>
	{/if}

	<div class="list bg-base-200 text-xs">
		{#each await translations as { id, partition, content } (id)}
			{@const original = project().getOriginalContent(path, partition)}
			<label class="list-row items-center">
				<input type="checkbox" class="checkbox" bind:checked={selectionFlags[id]} />
				<div class="flex flex-col gap-2">
					<pre class="whitespace-pre-wrap text-base-content/50">{await original}</pre>
					<pre class="whitespace-pre-wrap">{content}</pre>
				</div>
			</label>
		{/each}
	</div>

	<div class="mt-4 bg-base-200 p-4">
		{#if await overlaps}
			<div>Overlapping translations detected!</div>
		{:else}
			<pre class="text-xs whitespace-pre-wrap">{await previewContent}</pre>
		{/if}
	</div>
</div>
