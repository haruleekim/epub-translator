<script lang="ts">
    import _ from "lodash";
    import IconFileOutline from "virtual:icons/mdi/file-outline";
    import IconFolderOutline from "virtual:icons/mdi/folder-outline";

    interface Props {
        activePath?: string;
        paths?: readonly string[];
        onSelect?: (path: string) => void;
    }
    const { activePath, paths = [], onSelect = () => {} }: Props = $props();

    interface Tree {
        path: string;
        children: Record<string, Tree> | null;
    }

    const tree: Tree = $derived.by(() => {
        const tree: Tree = { path: "", children: {} };
        for (const path of paths) {
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
</script>

<div class="min-h-full min-w-full overflow-auto">
    <ul class="menu h-full w-full menu-xs">
        {#each Object.entries(tree.children ?? {}) as [segment, subtree] (segment)}
            <li>
                {@render treeView(segment, subtree)}
            </li>
        {/each}
    </ul>
</div>

{#snippet treeView(name: string, tree: Tree)}
    {#if tree.children}
        <details>
            <summary>
                <IconFolderOutline class="size-4" />
                {name}
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
            onclick={() => onSelect(tree.path)}
            class={{ "menu-active": activePath === tree.path }}
        >
            <IconFileOutline class="size-4" />
            {name}
        </button>
    {/if}
{/snippet}
