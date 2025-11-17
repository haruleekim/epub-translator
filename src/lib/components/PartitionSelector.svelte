<script lang="ts" module>
	const NODE_CLASSES = [
		"data-[node-highlight='active-single']:text-primary-content",
		"data-[node-highlight='active-single']:bg-primary",
		"data-[node-highlight='active-multiple']:text-error-content",
		"data-[node-highlight='active-multiple']:bg-error",
		"data-[node-highlight='inactive']:text-secondary-content",
		"data-[node-highlight='inactive']:bg-secondary",
		"data-[node-highlight='normal_selected']:text-accent-content",
		"data-[node-highlight='normal_selected']:bg-accent",
		"data-[node-highlight='active-single_selected']:text-[color-mix(in_srgb-linear,var(--color-accent-content),var(--color-primary-content))]",
		"data-[node-highlight='active-single_selected']:bg-[color-mix(in_srgb-linear,var(--color-accent),var(--color-primary))]",
		"data-[node-highlight='active-multiple_selected']:text-[color-mix(in_srgb-linear,var(--color-accent-content),var(--color-error-content))]",
		"data-[node-highlight='active-multiple_selected']:bg-[color-mix(in_srgb-linear,var(--color-accent),var(--color-error))]",
		"data-[node-highlight='inactive_selected']:text-[color-mix(in_srgb-linear,var(--color-accent-content),var(--color-secondary-content)_5%)]",
		"data-[node-highlight='inactive_selected']:bg-[color-mix(in_srgb-linear,var(--color-accent),var(--color-secondary))]",
	];
</script>

<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import { Dom, NodeId, Partition, type Token } from "$lib/core/dom";
	import type { Translation } from "$lib/translation";
	import type { AnyNode, Element, NodeWithChildren, Text } from "$lib/utils/virtual-dom";
	import DynamicElement from "./DynamicElement.svelte";

	const {
		html,
		translations = [],
		activeTranslationIds = [],
		partition,
		onSelectionChange,
		transformUrl,
		mode = "preview",
		class: classValue,
	}: {
		html: string;
		translations?: Translation[];
		activeTranslationIds?: string[];
		partition?: Partition | null;
		onSelectionChange?: (partition: Partition | null) => void;
		transformUrl?: (url: string) => string | Promise<string>;
		mode?: "preview" | "markup";
		class?: ClassValue | null;
	} = $props();

	const dom = $derived(Dom.loadAsync(html));

	const activeTranslations = $derived.by(() => {
		return translations.filter((t) => activeTranslationIds.includes(t.id));
	});

	function highlightType(nodeId: NodeId) {
		const selected = partition?.contains(nodeId) ?? false;
		const trs = translations.filter((p) => p.partition.contains(nodeId));
		const activeTrs = activeTranslations.filter((p) => p.partition.contains(nodeId));
		let result = "";
		if (activeTrs.length === 1) {
			result = "active-single";
		} else if (activeTrs.length > 1) {
			result = "active-multiple";
		} else if (trs.length > 0) {
			result = "inactive";
		} else {
			result = "normal";
		}
		if (selected) {
			result += " selected";
		}
		return result;
	}

	let start = $state<string | null>(partition?.first.toString() ?? null);
	let end = $state<string | null>(partition?.last.toString() ?? null);

	function updatePartition(): void {
		if (!start || !end) return void onSelectionChange?.(null);
		const partition = Partition.covering(NodeId.parse(start), NodeId.parse(end));
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
	class={["max-w-none text-xs select-none", classValue]}
>
	{#if mode === "markup"}
		<code class="whitespace-pre-wrap">
			{@render tagTokens((await dom).tokenize())}
		</code>
	{:else if mode === "preview"}
		<div class="prose max-w-none text-xs">
			{@render tree((await dom).root, NodeId.root())}
		</div>
	{/if}
</div>

{#snippet tagTokens(tokens: Token[])}
	{#each tokens as { node, nodeId, content, close } (`${nodeId}${close ? "!" : ""}`)}
		<span
			data-node-id={nodeId}
			data-node-type="text"
			data-node-highlight={highlightType(nodeId)}
			onpointerenter={handlePointerEnter}
			class={[
				"p-0.5 hover:text-accent",
				node.type !== "text" && "text-base-content/40",
				...NODE_CLASSES,
			]}
		>
			{content}
		</span>
	{/each}
{/snippet}

{#snippet tree(node: AnyNode, nodeId: NodeId)}
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
			{@render tagNode(node, nodeId)}
		{/if}
	{:else if node.type === "text"}
		{@render textNode(node, nodeId)}
	{/if}
{/snippet}

{#snippet childTrees(node: NodeWithChildren, nodeId: NodeId)}
	{#each node.children ?? [] as child, index (index)}
		{@render tree(child, nodeId.nthChild(index))}
	{/each}
{/snippet}

{#snippet textNode(node: Text, nodeId: NodeId)}
	{@const content = node.data.trim()}
	{#if content}
		<span
			data-node-id={nodeId}
			data-node-type="text"
			data-node-highlight={highlightType(nodeId)}
			onpointerenter={handlePointerEnter}
			class={["p-0.5 hover:text-accent", ...NODE_CLASSES]}
		>
			{node.data}
		</span>
	{/if}
{/snippet}

{#snippet tagNode(node: Element, nodeId: NodeId)}
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
		data-node-highlight={highlightType(nodeId)}
		onpointerenter={isDisplayLeaf ? handlePointerEnter : undefined}
		draggable={isDisplayLeaf ? false : undefined}
		class={(isDisplayLeaf && [
			"border border-transparent p-0.5 hover:border-accent",
			...NODE_CLASSES,
		]) ||
			undefined}
	>
		{@render childTrees(node, nodeId)}
	</DynamicElement>
{/snippet}
