<script lang="ts">
    import type { Action } from "svelte/action";
    import type { Attachment } from "svelte/attachments";
    import Epub from "@/core/epub";
    import { NodeId } from "@/core/translator";
    import { createNodeView, type NodeView } from "@/core/viewer";

    const addSelectionListener: Attachment = (root) => {
        function handleSelectionChange() {
            const selection = window.getSelection();
            if (!selection?.rangeCount) return;

            const { startContainer, endContainer, commonAncestorContainer } =
                selection.getRangeAt(0);
            let node: Node | null = commonAncestorContainer;
            while (node && node.parentNode !== root) node = node.parentNode;
            if (!node) return;

            let start: Node, end: Node, size: number;
            if (
                startContainer === commonAncestorContainer ||
                endContainer === commonAncestorContainer
            ) {
                [start, end, size] = [commonAncestorContainer, commonAncestorContainer, 1];
            } else {
                let [s, e] = [startContainer, endContainer] as [Node, Node];
                while (s.parentNode !== commonAncestorContainer) s = s.parentNode!;
                while (e.parentNode !== commonAncestorContainer) e = e.parentNode!;
                [start, end, size] = [s, e, 1];
                while (s !== e && size++) s = s.nextSibling!;
            }

            const partitionRange = new Range();
            partitionRange.setStartBefore(start);
            partitionRange.setEndAfter(end);

            CSS.highlights.clear();
            const highlight = new Highlight(partitionRange);
            CSS.highlights.set("translation-candidates", highlight);
        }
        document.addEventListener("selectionchange", handleSelectionChange);
        return () => {
            CSS.highlights.clear();
            document.removeEventListener("selectionchange", handleSelectionChange);
        };
    };

    const { epub, spineIndex }: { epub?: Promise<Epub>; spineIndex: number } = $props();
</script>

{#snippet nodeView(node: NodeView)}
    {#if node.type === "text"}
        <span data-node-id={node.id.toString()}>{@html node.text}</span>
    {:else if node.type === "element"}
        <span data-node-id={node.id.toString()}>
            {#each node.children as child}
                {@render nodeView(child)}
            {/each}
        </span>
    {:else if node.type === "document"}
        {#each node.children as child}
            {@render nodeView(child)}
        {/each}
    {/if}
{/snippet}

{#key epub}
    {#key spineIndex}
        <div class="p-1 selection:bg-transparent" {@attach addSelectionListener}>
            {#if epub}
                {@render nodeView(await createNodeView(await epub, spineIndex))}
            {/if}
        </div>
    {/key}
{/key}

<style lang="postcss">
    @reference "tailwindcss";
    @plugin "daisyui";

    [data-node-id] {
        @apply m-0.5 inline-block rounded border p-0.5;
    }

    ::highlight(translation-candidates) {
        @apply bg-rose-400 dark:bg-rose-500;
    }
</style>
