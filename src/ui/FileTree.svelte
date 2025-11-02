<script lang="ts">
    import IconFile from "virtual:icons/mdi/file-outline";
    import IconFolder from "virtual:icons/mdi/folder-outline";

    interface Props {
        paths?: readonly string[];
        onselect?: (path: string) => void;
    }
    const { paths = [], onselect = () => {} }: Props = $props();

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
                <IconFolder class="size-4" />
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
        <button onclick={() => onselect(hierarchy.path)}>
            <IconFile class="size-4" />
            {name}
        </button>
    {/if}
{/snippet}

<ul class="menu w-full max-w-xs menu-xs rounded-box bg-base-200">
    {#each Object.entries(hierarchy.children!) as [segment, subhierarchy] (segment)}
        <li>
            {@render entry(segment, subhierarchy)}
        </li>
    {/each}
</ul>
