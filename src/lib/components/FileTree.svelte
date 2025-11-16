<script lang="ts">
	import type { Snippet } from "svelte";
	import type { ClassValue } from "svelte/elements";
	import IconFileOutline from "virtual:icons/mdi/file-outline";
	import IconFolderOutline from "virtual:icons/mdi/folder-outline";

	interface Props {
		activePath?: string | null | undefined;
		paths?: readonly string[];
		onSelect?: (path: string) => void;
		defaultOpen?: boolean;
		meta?: Snippet<[string]>;
		class?: ClassValue | null | undefined;
	}
	const { activePath, paths, onSelect, defaultOpen, meta, class: classValue }: Props = $props();

	interface Tree {
		path: string;
		children: Record<string, Tree> | null;
	}

	const tree: Tree = $derived.by(() => {
		const tree: Tree = { path: "", children: {} };
		for (const path of paths ?? []) {
			let parent = tree;
			for (const segment of path.split("/")) {
				if (!parent.children) parent.children = {};
				if (!(segment in parent.children)) {
					parent.children[segment] = {
						path: parent.path ? `${parent.path}/${segment}` : segment,
						children: null,
					};
				}
				parent = parent.children[segment];
			}
		}
		return tree;
	});

	function flattenTree(name: string, tree: Tree): [string, Tree] {
		if (!tree.children) return [name, tree];
		const children: Record<string, Tree> = {};
		for (const [name, child] of Object.entries(tree.children)) {
			const [flattenName, flattenChild] = flattenTree(name, child);
			children[flattenName] = flattenChild;
		}
		if (Object.keys(children).length === 1) {
			const [onlyChildName, onlyChild] = Object.entries(children)[0];
			return [`${name}/${onlyChildName}`, onlyChild];
		} else {
			return [name, { ...tree, children }];
		}
	}

	const flattenedTree: Tree = $derived(flattenTree("", tree)[1]);
</script>

<ul class={["menu menu-xs", classValue]}>
	{#each Object.entries(flattenedTree.children ?? {}) as [segment, subtree] (segment)}
		<li>
			{@render treeView(segment, subtree)}
		</li>
	{/each}
</ul>

{#snippet treeView(name: string, tree: Tree)}
	{#if tree.children}
		<details open={defaultOpen}>
			<summary class="text-nowrap">
				<IconFolderOutline class="size-4" />
				<span>{name}</span>
			</summary>
			<ul>
				{#each Object.entries(tree.children) as [segment, subtree] (segment)}
					<li>
						{@render treeView(segment, subtree)}
					</li>
				{/each}
			</ul>
		</details>
	{:else}
		<button
			onclick={() => onSelect?.(tree.path)}
			class={["text-nowrap", { "menu-active": activePath === tree.path }]}
		>
			<IconFileOutline class="size-4" />
			<span>{name}</span>
			<span>{@render meta?.(tree.path)}</span>
			<span></span>
		</button>
	{/if}
{/snippet}
