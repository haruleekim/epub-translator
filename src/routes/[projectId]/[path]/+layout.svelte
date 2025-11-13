<script lang="ts">
	import IconBack from "virtual:icons/mdi/arrow-left";
	import IconClose from "virtual:icons/mdi/close";
	import IconMenu from "virtual:icons/mdi/menu";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import FileTree from "$lib/components/FileTree.svelte";
	import type { LayoutProps } from "./$types";
	import Context, { setContext } from "./context.svelte";

	const props: LayoutProps = $props();
	const projectId = $derived(props.params.projectId);
	const path = $derived(props.params.path);
	const project = $derived(props.data.project);
	const resource = $derived(props.data.resource);
	const cx = setContext(new Context());

	$effect(() => {
		[projectId, path];
		cx.partition = null;
	});

	type Mode = "select-partition" | "add-translation" | "compose-translations";
	let mode = $derived.by<Mode>(() => {
		const segments = props.data.url.pathname.split("/");
		return segments[segments.length - 1] as Mode;
	});

	let sidebarOpen = $state(false);
</script>

<div class="flex h-screen w-screen flex-col">
	<div class="navbar justify-between gap-1">
		<div>
			{@render navigationDrawer()}
		</div>

		<ul class="menu menu-horizontal menu-sm">
			<li>
				<a
					class={[mode === "select-partition" && "menu-active"]}
					href={resolve("/[projectId]/[path]/select-partition", {
						projectId,
						path: encodeURIComponent(path),
					})}
				>
					Select partition
				</a>
			</li>
			<li class={{ "menu-disabled": !cx.partition }}>
				<a
					class={[mode === "add-translation" && "menu-active"]}
					href={resolve("/[projectId]/[path]/add-translation", {
						projectId,
						path: encodeURIComponent(path),
					})}
					aria-disabled={!cx.partition}
				>
					Add translation
				</a>
			</li>
			<li>
				<a
					class={[mode === "compose-translations" && "menu-active"]}
					href={resolve("/[projectId]/[path]/compose-translations", {
						projectId,
						path: encodeURIComponent(path),
					})}
				>
					Compose translations
				</a>
			</li>
		</ul>
	</div>

	<div class="flex flex-1 gap-2 overflow-auto px-2 pb-2">
		{@render props.children()}
	</div>
</div>

{#snippet navigationDrawer()}
	<div class="drawer">
		<input id="navigation-drawer" type="checkbox" class="drawer-toggle" checked={sidebarOpen} />
		<div class="drawer-content">
			<button
				class="btn btn-circle border-none font-normal btn-ghost"
				onclick={() => (sidebarOpen = true)}
			>
				<IconMenu class="size-4" />
			</button>
		</div>
		<div class="drawer-side">
			<button
				aria-label="close sidebar"
				class="drawer-overlay"
				onclick={() => (sidebarOpen = false)}
			></button>
			<div class="flex h-full w-fit flex-col overflow-auto bg-base-200 select-none">
				<button
					class="btn mx-2 mt-3 mb-1 btn-circle border-none font-normal btn-ghost"
					onclick={() => (sidebarOpen = false)}
				>
					<IconClose class="size-4" />
				</button>
				<div class="w-fit flex-1 overflow-auto">
					<FileTree
						paths={project.epub.listSpinePaths()}
						activePath={resource?.path}
						onSelect={async (path) => {
							sidebarOpen = false;
							await goto(
								resolve("/[projectId]/[path]", {
									projectId: props.params.projectId,
									path: encodeURIComponent(path),
								}),
							);
						}}
					/>
				</div>
				<div class="p-2">
					<a class="btn flex w-full btn-ghost btn-xs" href={resolve(`/`)}>
						<IconBack class="size-4" />
						Project List
					</a>
				</div>
			</div>
		</div>
	</div>
{/snippet}
