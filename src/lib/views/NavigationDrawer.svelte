<script lang="ts">
	import IconBack from "virtual:icons/mdi/arrow-left";
	import IconClose from "virtual:icons/mdi/close";
	import IconMenu from "virtual:icons/mdi/menu";
	import FileTree from "$lib/components/FileTree.svelte";
	import Epub from "$lib/core/epub";

	type Props = {
		epub: Epub;
		path?: string | null;
		onPathChange?: (newPath: string | null) => void;
		opened?: boolean;
		onBackToProjectLists?: () => void;
	};

	let { epub, path, onPathChange, opened = $bindable(), onBackToProjectLists }: Props = $props();
</script>

<div class="drawer">
	<input id="navigation-drawer" type="checkbox" class="drawer-toggle" checked={opened} />
	<div class="drawer-content">
		<button
			class="btn btn-circle border-none font-normal btn-ghost"
			onclick={() => (opened = true)}
		>
			<IconMenu class="size-4" />
		</button>
	</div>
	<div class="drawer-side">
		<button aria-label="close sidebar" class="drawer-overlay" onclick={() => (opened = false)}
		></button>
		<div class="flex h-full w-fit flex-col overflow-auto bg-base-200 select-none">
			<button
				class="btn mx-2 mt-3 mb-1 btn-circle border-none font-normal btn-ghost"
				onclick={() => (opened = false)}
			>
				<IconClose class="size-4" />
			</button>
			<div class="w-fit flex-1 overflow-auto">
				<FileTree paths={epub.listSpinePaths()} activePath={path} onSelect={onPathChange} />
			</div>
			<div class="p-2">
				<button
					class="btn flex w-full btn-ghost btn-xs"
					onclick={() => onBackToProjectLists?.()}
				>
					<IconBack class="size-4" />
					Project Lists
				</button>
			</div>
		</div>
	</div>
</div>
