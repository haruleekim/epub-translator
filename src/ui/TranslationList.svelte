<script lang="ts">
    import type Translator from "@/core/translator";

    type Props = { translator: Translator; path: string };
    const { translator, path }: Props = $props();

    const selectionFlags = $state<Record<string, boolean>>({});
    const selectedIds = $derived(
        Object.entries(selectionFlags)
            .filter(([, v]) => v)
            .map(([k]) => k),
    );
    const isOverlapping = $derived(await translator.checkOverlaps(selectedIds));
    const previewContent = $derived(
        isOverlapping ? null : await translator.renderTranslatedContent(path, selectedIds),
    );
</script>

<div class="list bg-base-200 text-xs">
    {#each await translator.listTranslations(path) as { id, partition, content } (id)}
        {@const original = translator.getOriginalContent(path, partition)}
        <label class="list-row items-center">
            <input type="checkbox" class="checkbox" bind:checked={selectionFlags[id]} />
            <div class="flex flex-col gap-2">
                <pre class="whitespace-pre-wrap text-base-content/50">{original}</pre>
                <pre class="whitespace-pre-wrap">{content}</pre>
            </div>
        </label>
    {/each}
</div>

<div class="mt-4 bg-base-200 p-4">
    {#if isOverlapping}
        <div>Overlapping translations detected!</div>
    {:else}
        <pre class="text-xs whitespace-pre-wrap">{previewContent}</pre>
    {/if}
</div>
