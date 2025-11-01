<script lang="ts">
    import Epub from "@/core/epub";
    import NodeViewer from "./NodeViewer.svelte";
    import Preview from "./Preview.svelte";

    let epub = $state<Promise<Epub>>();
    let spineIndex = $state<number>(0);
    let previewMode = $state(true);
</script>

{#if $effect.pending()}
    <progress class="progress absolute h-0.5 rounded-none progress-primary"></progress>
{/if}

<div class="grid h-screen grid-cols-[auto_5fr_2fr] grid-rows-[auto_1fr_auto]">
    <div class="col-span-full row-start-1">
        <div class="flex justify-center py-1">
            <label class="label">
                NodeViewer
                <input type="checkbox" bind:checked={previewMode} class="toggle" />
                Preview
            </label>
        </div>
    </div>

    <div class="col-start-1 row-start-2 overflow-y-auto bg-base-300">
        <ul class="list m-2">
            {#each (await epub)?.spine as path, index}
                <li>
                    <button
                        type="button"
                        class="w-full link p-0.5 text-justify link-hover aria-current:link-accent"
                        aria-current={index === spineIndex}
                        onclick={() => (spineIndex = index)}
                    >
                        {path}
                    </button>
                </li>
            {/each}
        </ul>
    </div>

    <div class="col-start-2 row-start-2 overflow-auto bg-base-100">
        {#if previewMode}
            <Preview {epub} {spineIndex} />
        {:else}
            <NodeViewer {epub} {spineIndex} />
        {/if}
    </div>

    <div class="col-start-3 row-start-2 bg-base-200">
        <div class="hero h-full">translation view</div>
    </div>

    <div class="col-span-full row-start-3">
        <label class="btn w-full rounded-none btn-primary">
            <input
                type="file"
                accept="application/epub+zip"
                hidden
                onchange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    epub = file && Epub.from(file);
                    epub?.then(() => (spineIndex = 0));
                }}
            />
            {#await epub}
                <span class="loading loading-spinner"></span>
            {/await}
            Upload EPUB File
        </label>
    </div>
</div>
