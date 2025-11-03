<script lang="ts">
    import _ from "lodash";
    import IconFileOutline from "virtual:icons/mdi/file-outline";
    import IconFolderOutline from "virtual:icons/mdi/folder-outline";

    interface Props {
        activePath?: string;
        paths?: readonly string[];
        onselect?: (path: string) => void;
    }
    const { activePath, paths = [], onselect = () => {} }: Props = $props();

    interface Hierarchy {
        path: string;
        children: Record<string, Hierarchy> | null;
    }

    const hierarchy: Hierarchy = $derived.by(() => {
        const hierarchy: Hierarchy = { path: "", children: {} };
        for (const path of paths) {
            let parent = hierarchy;
            for (const segment of path.split("/")) {
                if (!parent.children) parent.children = {};
                if (!(segment in parent.children)) {
                    parent.children[segment] = {
                        path: `${parent.path}/${segment}`,
                        children: null,
                    };
                }
                parent = parent.children[segment];
            }
        }
        return hierarchy;
    });
</script>

{#snippet entry(name: string, hierarchy: Hierarchy)}
    {#if hierarchy.children}
        <details>
            <summary>
                <IconFolderOutline class="size-4" />
                {name}
            </summary>
            <ul>
                {#each Object.entries(hierarchy.children) as [segment, subhierarchy] (segment)}
                    <li>
                        {@render entry(segment, subhierarchy)}
                    </li>
                {/each}
            </ul>
        </details>
    {:else}
        <button
            onclick={() => onselect(hierarchy.path)}
            class={{ "menu-active": activePath === hierarchy.path }}
        >
            <IconFileOutline class="size-4" />
            {name}
        </button>
    {/if}
{/snippet}

<div class="h-full w-full">
    {#if _.size(hierarchy.children)}
        <ul class="menu w-full menu-xs">
            {#each Object.entries(hierarchy.children!) as [segment, subhierarchy] (segment)}
                <li>
                    {@render entry(segment, subhierarchy)}
                </li>
            {/each}
        </ul>
    {:else}
        <div class="hero h-full">
            <div class="hero-content text-xl uppercase">Empty</div>
        </div>
    {/if}
</div>
