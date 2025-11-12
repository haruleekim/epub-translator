<script lang="ts">
	import { getContext } from "$lib/context.svelte";
	import SpineItemView from "$lib/views/SpineItemView.svelte";
	import type { PageProps } from "./$types";

	const cx = getContext();

	const props: PageProps = $props();

	const project = await cx.loadProjectIfNeeded(props.params.projectId);
	if (!project) throw new Error("Project not found");
</script>

<SpineItemView {project} />
