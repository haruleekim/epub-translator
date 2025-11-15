<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import { getWorkspaceContext } from "$lib/context.svelte";

	const props: { class?: ClassValue | null } = $props();

	const cx = getWorkspaceContext();
</script>

<div class={props.class}>
	<button
		class="btn w-full btn-primary"
		onclick={async () => {
			const blob = await cx.project.exportEpub();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${cx.project.id}.epub`;
			a.click();
			URL.revokeObjectURL(url);
		}}
	>
		Export translated EPUB
	</button>
</div>
