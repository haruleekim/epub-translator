<script lang="ts">
    import type { ClassValue } from "svelte/elements";
    import IconFileImage from "virtual:icons/mdi/file-image";
    import { NodeId, Partition } from "@/core/common";
    import * as vdom from "@/utils/virtual-dom";

    type NodeTree = NodeTreeContainer | NodeTreeLeaf;

    type NodeTreeLeaf = NodeTreeLeafText | NodeTreeLeafImage;

    type NodeTreeContainer = {
        type: "container";
        id: NodeId;
        children: NodeTree[];
    };

    type NodeTreeLeafText = {
        type: "text";
        id: NodeId;
        text: string;
    };

    type NodeTreeLeafImage = {
        type: "image";
        id: NodeId;
    };

    async function buildNodeTree(node: vdom.AnyNode, id: NodeId): Promise<NodeTree | null> {
        if (node instanceof vdom.Document || node instanceof vdom.Element) {
            if (node instanceof vdom.Element && ["style", "script"].includes(node.tagName)) {
                return null;
            }
            if (node instanceof vdom.Element && ["img", "svg", "image"].includes(node.tagName)) {
                return { type: "image", id };
            }
            if (node.childNodes.length === 0) {
                return null;
            }
            if (node.childNodes.length === 1) {
                return await buildNodeTree(node.firstChild!, id.firstChild);
            }
            const children: NodeTree[] = [];
            let childId = id.firstChild;
            for (const child of node.childNodes) {
                const childTree = await buildNodeTree(child, childId);
                if (childTree) children.push(childTree);
                childId = childId.sibling(1);
            }
            return { type: "container", id, children };
        } else if (node instanceof vdom.Text) {
            const text = node.data.trim();
            return text ? { type: "text", id, text } : null;
        } else {
            return null;
        }
    }

    export async function parseContentToNodeTree(content: string): Promise<NodeTree | null> {
        const doc = vdom.parseDocument(content, { xmlMode: true, decodeEntities: false });
        return await buildNodeTree(doc, new NodeId([]));
    }

    type Props = {
        content: string;
        onSelectionChange?: (partition: Partition | null) => void;
        class?: ClassValue | null | undefined;
        partition?: Partition;
    };

    let {
        content,
        partition = $bindable(),
        onSelectionChange,
        class: classValue,
    }: Props = $props();

    const nodeTree = $derived(await parseContentToNodeTree(content));

    let start = $state<string | null>(partition?.first.toString() ?? null);
    let end = $state<string | null>(partition?.last.toString() ?? null);

    let startId = $derived<NodeId | null>(start ? NodeId.parse(start) : null);
    let endId = $derived<NodeId | null>(end ? NodeId.parse(end) : null);

    function updatePartition() {
        if (!startId || !endId) return (partition = void onSelectionChange?.(null));
        const commonAncestor = NodeId.commonAncestor(startId, endId);
        const ordering = NodeId.compare(startId, endId);
        if (ordering) {
            let [s, e] = ordering < 0 ? [startId, endId] : [endId, startId];
            while (s.length > commonAncestor.length + 1) s = s.parent;
            while (e.length > commonAncestor.length + 1) e = e.parent;
            let [offset, size] = [s, 1];
            while (NodeId.compare(s, e) && size++) s = s.sibling(1);
            partition = new Partition(offset, size);
        } else {
            partition = new Partition(commonAncestor);
        }
        onSelectionChange?.(partition);
    }

    $effect(() => {
        [startId, endId, onSelectionChange];
        queueMicrotask(updatePartition);
    });

    let isMouseDown: boolean = false;
    let waitingUnselect: string | null;

    const handleMouseDown = (event: MouseEvent, nodeId: string) => {
        event.stopPropagation();
        isMouseDown = true;
        waitingUnselect = null;
        if (event.shiftKey && start) {
            end = nodeId;
        } else if (start === nodeId && end === nodeId) {
            waitingUnselect = nodeId;
        } else {
            start = end = nodeId;
        }
    };

    const handleMouseEnter = (event: MouseEvent, nodeId: string) => {
        event.stopPropagation();
        if (!isMouseDown) return;
        end = nodeId;
    };

    const handleMouseUp = (_event: MouseEvent, nodeId: string) => {
        const equalsStart = start === nodeId;
        const equalsEnd = end === nodeId;
        const isWaitingUnselect = waitingUnselect === nodeId;
        if (equalsStart && equalsEnd && isWaitingUnselect) {
            start = end = waitingUnselect = null;
        }
    };
</script>

<svelte:document onmouseup={() => (isMouseDown = false)} />

<div class={["cursor-pointer p-1 select-none", classValue]}>
    {#if nodeTree}
        {@render nodeTreeView(nodeTree)}
    {/if}
</div>

{#snippet nodeTreeView(node: NodeTree)}
    {@const nodeId = node.id.toString()}
    <span
        data-node-id={nodeId}
        data-node-selected={partition?.contains(node.id)}
        role="button"
        tabindex={-1}
        onmousedown={(evt) => handleMouseDown(evt, nodeId)}
        onmouseup={(evt) => handleMouseUp(evt, nodeId)}
        onmouseenter={(evt) => handleMouseEnter(evt, nodeId)}
    >
        {#if node.type === "container"}
            {#each node.children as child}
                {@render nodeTreeView(child)}
            {/each}
        {:else if node.type === "text"}
            {@html node.text}
        {:else if node.type === "image"}
            <IconFileImage class="size-4" />
        {/if}
    </span>
{/snippet}

<style lang="postcss">
    @reference "../tailwind.css";

    [data-node-id] > [data-node-id] {
        @apply m-0.5 inline-block rounded border border-base-content/25 p-0.5 align-middle text-xs transition-colors;

        &[data-node-selected="true"] {
            @apply border-accent/25 text-accent;
        }

        &:hover:not(:has(> [data-node-id]:hover)) {
            @apply border-base-content/75;
            &[data-node-selected="true"] {
                @apply border-accent/75;
            }
        }
    }
</style>
