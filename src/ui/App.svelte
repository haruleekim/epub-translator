<script lang="ts">
    import IconChevronLeft from "virtual:icons/mdi/chevron-left";
    import IconChevronRight from "virtual:icons/mdi/chevron-right";
    import ContentView from "@/components/ContentView.svelte";
    import FileTree from "@/components/FileTree.svelte";
    import PartitionSelector from "@/components/PartitionSelector.svelte";
    import TranslationComposer from "@/core/composer";
    import Epub from "@/core/epub";
    import Navbar, { type Mode } from "./Navbar.svelte";
    import TranslationList from "./TranslationList.svelte";

    const { epub }: { epub: Epub } = $props();

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

    const currentResource = $derived(
        currentResourcePath ? epub.getResource(currentResourcePath) : null,
    );
    const blob = $derived(currentResource ? await currentResource.getBlob() : null);
    const content = $derived(await blob?.text());
    const composer = $derived(content && new TranslationComposer(content));

    async function transformUrl(url: string) {
        const path = currentResource && Epub.resolvePath(url, currentResource.path);
        const transformedUrl = path && (await epub.getResource(path)?.getBlobUrl());
        return transformedUrl ?? url;
    }
</script>

<div class="grid h-screen grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
    <div class="z-200 col-span-full row-start-1 bg-base-200 shadow">
        <Navbar bind:mode />
    </div>

    <div class="z-100 col-start-1 row-start-2 flex flex-col overflow-auto bg-base-200 shadow">
        {#if showFileTree}
            <div class="min-w-3xs flex-1 overflow-auto">
                <FileTree
                    paths={fileTreePaths}
                    activePath={currentResourcePath}
                    onSelect={(path) => (currentResourcePath = path)}
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
                {#if blob}
                    <ContentView {blob} {transformUrl} />
                {/if}
            {:else if mode === "translate" && content}
                <PartitionSelector {content} />
            {:else if mode === "preview" && composer}
                <TranslationList {composer} />
            {/if}
        {/key}
    </div>
</div>
