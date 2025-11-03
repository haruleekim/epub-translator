<script lang="ts">
    import _ from "lodash";
    import type { TranslationComposer } from "@/core/composer";

    const { composer }: { composer: TranslationComposer } = $props();
    const selectionFlags = $state<Record<string, boolean>>(
        _.mapValues(composer.translations, () => false),
    );
    const selectedIds = $derived(
        Object.entries(selectionFlags)
            .filter(([, v]) => v)
            .map(([k]) => k),
    );
    const overlapping = $derived(composer.hasOverlappingTranslations(selectedIds));
</script>

<div class="list bg-base-200 text-xs">
    {#each Object.entries(composer.translations) as [id, translation] (id)}
        {@const original = composer.getOriginalContent(translation.partition)}
        <label class="list-row items-center">
            <input type="checkbox" class="checkbox" bind:checked={selectionFlags[id]} />
            <div class="flex flex-col gap-2">
                <pre class="whitespace-pre-wrap text-base-content/50">{original}</pre>
                <pre class="whitespace-pre-wrap">{translation.content}</pre>
            </div>
        </label>
    {/each}
</div>

<div class="mt-4 bg-base-200 p-4">
    {#if overlapping}
        <div>Overlapping translations detected!</div>
    {:else}
        <pre class="text-xs whitespace-pre-wrap">{composer.render(selectedIds)}</pre>
    {/if}
</div>
