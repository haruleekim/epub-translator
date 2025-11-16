<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import FileTree from "$lib/components/FileTree.svelte";
	import { getWorkspaceContext } from "$lib/context.svelte";

	const props: { class: ClassValue | null } = $props();
	const cx = getWorkspaceContext();
</script>

<FileTree
	class={props.class}
	paths={cx.project.epub.listSpinePaths()}
	activePath={cx.path}
	onSelect={async (newPath) => {
		if (cx.locked) return;
		cx.path = newPath;
		cx.partition = null;
		cx.panelMode = "navigate-resources";
	}}
>
	{#snippet meta(path)}
		{@const translations = cx.project.translationsForPath(path)}
		{@const overlapping = cx.project.checkOverlaps(translations.map((t) => t.id))}
		<span
			class={[
				"badge rounded-full badge-xs",
				overlapping && "badge-error",
				!overlapping && translations.length > 0 && "badge-success",
			]}
		>
			{translations.length}
		</span>
	{/snippet}
</FileTree>
