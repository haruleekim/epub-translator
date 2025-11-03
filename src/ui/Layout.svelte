<script lang="ts">
    import IconChevronLeft from "virtual:icons/mdi/chevron-left";
    import IconChevronRight from "virtual:icons/mdi/chevron-right";
    import { TranslationComposer } from "@/core/composer";
    import type Epub from "@/core/epub";
    import ResourceViewManager from "@/core/resource-view-manager";
    import FileTree from "./FileTree.svelte";
    import Navbar, { type Mode } from "./Navbar.svelte";
    import PartitionSelector from "./PartitionSelector.svelte";
    import ResourceViewer from "./ResourceViewer.svelte";
    import TranslationList from "./TranslationList.svelte";

    const { epub }: { epub: Epub } = $props();

    const resourceViewManager = $derived(new ResourceViewManager(epub));

    let mode = $state<Mode>("translate");

    let showAllResources = $state<boolean>(false);

    let showFileTree = $state<boolean>(true);
    let fileTreePaths = $derived.by(() => {
        if (showAllResources) {
            return epub.getResourcePaths();
        } else {
            return epub.spine;
        }
    });

    let currentResourcePath = $state<string>();

    const content = $derived(
        currentResourcePath &&
            (await epub
                .getResource(currentResourcePath)
                .getBlob()
                .then((blob) => blob.text())),
    );

    const composer = $derived(content && new TranslationComposer(content));
</script>

<div class="grid h-screen grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
    <div class="z-200 col-span-full row-start-1 bg-base-200 shadow">
        <Navbar bind:mode />
    </div>

    <div class="z-100 col-start-1 row-start-2 flex flex-col overflow-auto bg-base-200 shadow">
        {#if showFileTree}
            <div class="min-w-3xs flex-1 overflow-auto">
                <FileTree
                    activePath={currentResourcePath}
                    paths={fileTreePaths}
                    onselect={(path) => (currentResourcePath = path)}
                />
            </div>
            <div class="flex flex-none items-center bg-base-300 px-4 py-2 text-xs">
                <label class="label flex-1">
                    <input
                        type="checkbox"
                        bind:checked={showAllResources}
                        class="checkbox checkbox-xs"
                    />
                    Show all resources
                </label>
                <button
                    class="btn btn-circle btn-ghost btn-sm"
                    onclick={() => (showFileTree = false)}
                >
                    <IconChevronLeft class="size-5" />
                </button>
            </div>
        {:else}
            <label class="flex h-full items-center p-1.5 hover:cursor-pointer">
                <button
                    class="btn btn-circle btn-ghost btn-sm"
                    onclick={() => (showFileTree = true)}
                >
                    <IconChevronRight class="size-6" />
                </button>
            </label>
        {/if}
    </div>

    <div class="col-start-2 row-start-2 overflow-auto">
        {#key currentResourcePath}
            {#if mode === "browse" && currentResourcePath}
                <ResourceViewer path={currentResourcePath} {resourceViewManager} />
            {:else if mode === "translate" && content}
                <PartitionSelector {content} />
            {:else if mode === "preview" && composer}
                <TranslationList {composer} />
            {/if}
        {/key}
    </div>
</div>
