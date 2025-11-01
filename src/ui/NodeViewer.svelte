<script lang="ts">
    import Epub from "@/core/epub";
    import { createNodeView, type NodeView } from "@/core/viewer";

    const { epub, spineIndex }: { epub?: Promise<Epub>; spineIndex: number } = $props();
</script>

{#snippet nodeView(node: NodeView)}
    {#if node.type === "text"}
        <span class="border p-0.5">{@html node.text}</span>
    {:else if node.type === "element"}
        <span class="border p-0.5">
            {#each node.children as child}
                {@render nodeView(child)}
            {/each}
        </span>
    {:else if node.type === "document"}
        <div>
            {#each node.children as child}
                {@render nodeView(child)}
            {/each}
        </div>
    {/if}
{/snippet}

{#if epub}
    {@render nodeView(await createNodeView(await epub, spineIndex))}
{/if}

<!-- <iframe
    title="EPUB Viewer"
    srcdoc={epub && (await createViewerContent(await epub, spineIndex))}
    sandbox="allow-same-origin allow-scripts"
    class="h-full w-full"
    onload={handleFrameLoad}
></iframe> -->
