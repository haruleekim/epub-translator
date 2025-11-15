<script lang="ts">
	import ProjectListView from "$lib/views/ProjectListView.svelte";
	import type { PageProps } from "./$types";

	const props: PageProps = $props();
</script>

<ProjectListView projects={props.data.projects} />
