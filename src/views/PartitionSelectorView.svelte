<script lang="ts">
    import ContentViewer from "@/components/ContentViewer.svelte";
    import PartitionSelector from "@/components/PartitionSelector.svelte";
    import type { Partition } from "@/core/common";
    import type { Resource } from "@/core/epub";
    import type Translator from "@/core/translator";

    type Props = {
        translator: Translator;
        resource: Resource;
        partition?: Partition;
    };
    let { translator, resource, partition = $bindable() }: Props = $props();

    const content = $derived(resource.getBlob().then((blob) => blob.text()));

    const partitionContentPromise = $derived.by(() => {
        if (!partition) return;
        return translator.getOriginalContent(resource.path, partition);
    });
    const partitionContent = $derived(await partitionContentPromise);
</script>

<div class="flex h-full w-full flex-col overflow-auto">
    <PartitionSelector content={await content} bind:partition class="flex-1 overflow-auto" />

    <div class="flex h-40 gap-2 overflow-auto bg-base-200">
        <ContentViewer
            blob={new Blob([partitionContent ?? ""], { type: "text/html" })}
            transformUrl={async (url) => {
                return (await resource?.resolveUrl(url)) ?? url;
            }}
            class="flex-1 overflow-auto"
        />
        <div class="flex-1 overflow-auto text-xs">
            <pre class="whitespace-pre-wrap">{partitionContent}</pre>
        </div>
    </div>
</div>
