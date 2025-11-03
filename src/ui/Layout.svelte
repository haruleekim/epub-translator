<script lang="ts">
    import IconChevronLeft from "virtual:icons/mdi/chevron-left";
    import IconChevronRight from "virtual:icons/mdi/chevron-right";
    import type Epub from "@/core/epub";
    import FileTree from "./FileTree.svelte";
    import Navbar, { type Mode } from "./Navbar.svelte";

    const { epub }: { epub: Epub } = $props();

    let mode = $state<Mode>("browse");

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
</script>

<div class="grid h-screen grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
    <div class="col-span-full row-start-1 bg-base-200">
        <Navbar bind:mode />
    </div>

    <div class="col-start-1 row-start-2 flex flex-col overflow-auto bg-base-200">
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

    <div class="col-start-2 row-start-2"></div>
</div>
