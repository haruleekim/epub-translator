<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import IconFileImage from "virtual:icons/mdi/file-image";
	import { NodeId, Partition, Dom } from "$lib/core/dom";
	import * as vdom from "$lib/utils/virtual-dom";

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
				childId = childId.sibling(1)!;
			}
			return { type: "container", id, children };
		} else if (node instanceof vdom.Text) {
			const text = node.data.trim();
			return text ? { type: "text", id, text } : null;
		} else {
			return null;
		}
	}

	export async function parseContentToNodeTree(
		content: string,
	): Promise<NodeTreeContainer | null> {
		const dom = await Dom.loadAsync(content);
		return (await buildNodeTree(dom.root, NodeId.root())) as NodeTreeContainer;
	}

	type Props = {
		content: string;
		partition?: Partition;
		onSelectionChange?: (partition: Partition | null) => void;
		class?: ClassValue | null | undefined;
	};

	let {
		content,
		partition = $bindable(),
		onSelectionChange,
		class: classValue,
	}: Props = $props();

	const nodeTreeRoot = $derived(await parseContentToNodeTree(content));

	let start = $state<string | null>(partition?.first.toString() ?? null);
	let end = $state<string | null>(partition?.last.toString() ?? null);

	function updatePartition(): void {
		if (!start || !end) return (partition = void onSelectionChange?.(null));
		const [startId, endId] = [NodeId.parse(start), NodeId.parse(end)];
		const commonAncestor = NodeId.commonAncestor(startId, endId);
		const ordering = NodeId.compare(startId, endId);
		if (ordering) {
			let [s, e] = ordering < 0 ? [startId, endId] : [endId, startId];
			while (s.length > commonAncestor.length + 1) s = s.parent!;
			while (e.length > commonAncestor.length + 1) e = e.parent!;
			let [offset, size] = [s, 1];
			while (NodeId.compare(s, e) && size++) s = s.sibling(1)!;
			partition = new Partition(offset, size);
		} else {
			partition = new Partition(commonAncestor);
		}
		onSelectionChange?.(partition);
	}

	$effect(() => {
		[start, end, onSelectionChange];
		queueMicrotask(updatePartition);
	});

	let lastPointerDownWasOnAlreadySelectedUnitPartition = false;

	function getNodeIdFromTarget(event: Event): string | undefined {
		if (!(event.target instanceof HTMLElement)) return;
		return event.target.dataset.nodeId;
	}

	function handlePointerDown(event: PointerEvent) {
		if (!(event.buttons & 1)) return;
		const nodeId = getNodeIdFromTarget(event);
		if (!nodeId) return;
		lastPointerDownWasOnAlreadySelectedUnitPartition = start === nodeId && end === nodeId;
		if (event.shiftKey && start) {
			end = nodeId;
		} else {
			start = end = nodeId;
		}
	}

	function handlePointerEnter(event: PointerEvent) {
		if (!(event.buttons & 1)) return;
		const nodeId = getNodeIdFromTarget(event);
		if (!nodeId) return;
		end = nodeId;
	}

	function handlePointerUp(event: PointerEvent) {
		const nodeId = getNodeIdFromTarget(event);
		if (!nodeId) return;
		if (
			start === nodeId &&
			end === nodeId &&
			lastPointerDownWasOnAlreadySelectedUnitPartition
		) {
			start = end = null;
		}
	}
</script>

<div
	role="application"
	onpointerdown={handlePointerDown}
	onpointerup={handlePointerUp}
	class={classValue}
>
	{#if nodeTreeRoot}
		{#each nodeTreeRoot.children as child (child.id)}
			{@render nodeTreeView(child)}
		{/each}
	{/if}
</div>

{#snippet nodeTreeView(node: NodeTree)}
	{@const nodeId = node.id.toString()}
	<span
		data-node-id={nodeId}
		data-node-selected={partition?.contains(node.id) || undefined}
		onpointerenter={handlePointerEnter}
	>
		{#if node.type === "container"}
			{#each node.children as child (child.id)}
				{@render nodeTreeView(child)}
			{/each}
		{:else if node.type === "text"}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html node.text}
		{:else if node.type === "image"}
			<IconFileImage class="pointer-events-none size-4" />
		{/if}
	</span>
{/snippet}

<style lang="postcss">
	@reference "../../app.css";

	[data-node-id] {
		@apply m-0.5 inline-block cursor-pointer rounded border p-0.5 align-middle text-xs transition-colors select-none;
		@apply border-base-content/25 text-base-content;
		&:not(:has(> [data-node-id]:hover)):hover {
			@apply border border-base-content/75;
		}

		&[data-node-selected] {
			@apply border-accent/25 text-accent;
			&:not(:has(> [data-node-id]:hover)):hover {
				@apply border border-accent/75;
			}
		}
	}
</style>
