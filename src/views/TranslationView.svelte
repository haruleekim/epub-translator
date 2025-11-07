<script lang="ts">
    import type { Partition } from "@/core/common";
    import { translateByOpenAI } from "@/lib/openai";
    import type Translator from "@/lib/translator";

    type Props = {
        translator: Translator;
        path: string;
        partition?: Partition;
    };
    const { translator: translatorProp, path, partition }: Props = $props();

    let translator = $derived.by(() => {
        translatorProp;
        return () => translatorProp;
    });
    function refreshTranslator() {
        translator = () => translatorProp;
    }

    const selectionFlags = $state<Record<string, boolean>>({});
    const selectedIds = $derived(
        Object.entries(selectionFlags)
            .filter(([, v]) => v)
            .map(([k]) => k),
    );

    let translations = $derived(translator().listTranslations(path));
    let overlaps: Promise<boolean> = $derived(translator().checkOverlaps(selectedIds));
    let previewContent: Promise<string> = $derived(
        translator().renderTranslatedContent(path, selectedIds),
    );

    let loading = $state(false);
</script>

<div>
    {#if partition}
        <div>
            <div>{partition}</div>
            <pre class="text-xs whitespace-pre-wrap text-base-content/50">
                {await translator().getOriginalContent(path, partition)}
            </pre>
            <div>
                <button
                    class="btn btn-sm btn-primary"
                    onclick={async () => {
                        loading = true;
                        await translateByOpenAI(translator(), path, partition, {
                            apiKey: import.meta.env.VITE_OPENAI_API_KEY,
                            dangerouslyAllowBrowser: true,
                        }).finally(() => (loading = false));
                        refreshTranslator();
                    }}
                >
                    {#if loading}
                        <span class="loading loading-spinner"></span>
                    {/if}
                    Translate
                </button>
            </div>
        </div>
    {/if}

    <div class="list bg-base-200 text-xs">
        {#each await translations as { id, partition, content } (id)}
            {@const original = translator().getOriginalContent(path, partition)}
            <label class="list-row items-center">
                <input type="checkbox" class="checkbox" bind:checked={selectionFlags[id]} />
                <div class="flex flex-col gap-2">
                    <pre class="whitespace-pre-wrap text-base-content/50">{await original}</pre>
                    <pre class="whitespace-pre-wrap">{content}</pre>
                </div>
            </label>
        {/each}
    </div>

    <div class="mt-4 bg-base-200 p-4">
        {#if await overlaps}
            <div>Overlapping translations detected!</div>
        {:else}
            <pre class="text-xs whitespace-pre-wrap">{await previewContent}</pre>
        {/if}
    </div>
</div>
