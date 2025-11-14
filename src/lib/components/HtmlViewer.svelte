<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import { Dom, NodeId, Partition } from "$lib/core/dom";
	import type { AnyNode, Element, NodeWithChildren } from "$lib/utils/virtual-dom";
	import DynamicElement from "./DynamicElement.svelte";

	let {
		html,
		partition = $bindable(),
		onSelectionChange,
		transformUrl,
		class: classValue,
	}: {
		html: string;
		partition?: Partition | null;
		onSelectionChange?: (partition: Partition | null) => void;
		transformUrl?: (url: string) => string | Promise<string>;
		class?: ClassValue | null;
	} = $props();

	const dom = $derived(Dom.loadAsync(html));

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
	onpointerdown={handlePointerDown}
	onpointerup={handlePointerUp}
	class={["prose max-w-none text-xs select-none", classValue]}
>
	{@render tree((await dom).root, NodeId.root())}
</div>

{#snippet tree(node: AnyNode, nodeId: NodeId)}
	{@const selected = partition?.contains(nodeId) ? "" : undefined}

	{#if node.type === "root"}
		{@render childTrees(node, nodeId)}
	{:else if node.type === "tag"}
		{#if node.tagName === "html"}
			{@render childTrees(node, nodeId)}
		{:else if node.tagName === "body"}
			{@render childTrees(node, nodeId)}
		{:else if node.tagName === "head" || node.tagName === "style" || node.tagName === "script"}
			<!-- Ignore -->
		{:else}
			{@render tag(node, nodeId)}
		{/if}
	{:else if node.type === "text"}
		{@const content = node.data.trim()}
		{#if content}
			<span
				data-node-id={nodeId}
				data-node-type="text"
				data-selected={selected}
				onpointerenter={handlePointerEnter}
				class="p-0.5 hover:text-accent data-selected:bg-accent data-selected:text-accent-content"
			>
				{node.data}
			</span>
		{/if}
	{/if}
{/snippet}

{#snippet childTrees(node: NodeWithChildren, nodeId: NodeId)}
	{#each node.children ?? [] as child, index (index)}
		{@render tree(child, nodeId.nthChild(index))}
	{/each}
{/snippet}

{#snippet tag(node: Element, nodeId: NodeId)}
	{@const selected = partition?.contains(nodeId) ? "" : undefined}
	{@const isDisplayLeaf =
		["br", "hr", "img", "video", "audio", "embed", "picture"].includes(node.tagName) &&
		node.children.length === 0}
	{@const attrs = {
		src: (node.attribs.src && (await transformUrl?.(node.attribs.src))) ?? node.attribs.src,
	}}
	<DynamicElement
		this={node.tagName}
		{...attrs}
		data-node-id={nodeId}
		data-node-type="tag"
		data-selected={isDisplayLeaf ? selected : undefined}
		onpointerenter={isDisplayLeaf ? handlePointerEnter : undefined}
		draggable={isDisplayLeaf ? false : undefined}
		class={isDisplayLeaf
			? "border border-transparent p-0.5 hover:border-accent data-selected:border-accent data-selected:bg-accent"
			: undefined}
	>
		{@render childTrees(node, nodeId)}
	</DynamicElement>
{/snippet}
