<script lang="ts">
    import IconFileImage from "virtual:icons/mdi/file-image";
    import { NodeId, Partition } from "@/core/composer";
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
                return await buildNodeTree(node.firstChild!, id.firstChild());
            }
            const children: NodeTree[] = [];
            let childId = id.firstChild();
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

    const { content }: { content: string } = $props();
    const nodeTree = $derived(await parseContentToNodeTree(content));

    let start = $state<NodeId | null>(null);
    let end = $state<NodeId | null>(null);

    const partition = $derived.by(() => {
        if (!start || !end) return;
        const commonAncestor = NodeId.commonAncestor(start, end);
        const ordering = NodeId.compare(start, end);
        if (ordering) {
            let [s, e] = ordering < 0 ? [start, end] : [end, start];
            while (s.length > commonAncestor.length + 1) s = s.parent();
            while (e.length > commonAncestor.length + 1) e = e.parent();
            let [offset, size] = [s, 1];
            while (NodeId.compare(s, e) && size++) s = s.sibling(1);
            return new Partition(offset, size);
        } else {
            return new Partition(commonAncestor);
        }
    });

    let isMouseDown: boolean = false;
    let waitingUnselect: NodeId | null;

    const handleMouseDown = (evt: MouseEvent, nodeId: NodeId) => {
        evt.stopPropagation();
        isMouseDown = true;
        waitingUnselect = null;
        if (evt.shiftKey && start) {
            end = nodeId;
        } else if (start && start.equals(nodeId) && end && end.equals(nodeId)) {
            waitingUnselect = nodeId;
        } else {
            start = end = nodeId;
        }
    };

    const handleMouseEnter = (evt: MouseEvent, nodeId: NodeId) => {
        evt.stopPropagation();
        if (!isMouseDown) return;
        end = nodeId;
    };

    const handleMouseUp = (_evt: MouseEvent, nodeId: NodeId) => {
        const equalsStart = start?.equals(nodeId) ?? false;
        const equalsEnd = end?.equals(nodeId) ?? false;
        const isWaitingUnselect = waitingUnselect?.equals(nodeId) ?? false;
        if (equalsStart && equalsEnd && isWaitingUnselect) {
            start = end = waitingUnselect = null;
        }
    };
</script>

<svelte:document onmouseup={() => (isMouseDown = false)} />

<div class="flex h-full w-full flex-col">
    <div class="flex-1 cursor-pointer overflow-auto p-1 select-none">
        {#if nodeTree}
            {@render nodeTreeView(nodeTree)}
        {/if}
    </div>

    <div class="flex h-12 items-center bg-base-100 p-2">
        {#if partition}
            <code class="badge badge-md badge-primary">{partition}</code>
        {/if}
    </div>
</div>

{#snippet nodeTreeView(node: NodeTree)}
    <span
        data-node-id={node.id.toString()}
        data-node-selected={partition?.contains(node.id)}
        role="button"
        tabindex={-1}
        onmousedown={(evt) => handleMouseDown(evt, node.id)}
        onmouseup={(evt) => handleMouseUp(evt, node.id)}
        onmouseenter={(evt) => handleMouseEnter(evt, node.id)}
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
