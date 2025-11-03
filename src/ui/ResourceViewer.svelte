<script lang="ts">
    import type Epub from "@/core/epub";
    import type ResourceViewManager from "@/core/resource-view-manager";

    let {
        path,
        resourceViewManager,
    }: { epub: Epub; path: string; resourceViewManager: ResourceViewManager } = $props();

    const url = $derived(resourceViewManager.getAugmentedContentUrl(path));
</script>

<iframe src={await url} title="Resource Viewer" class="h-full w-full overflow-auto"></iframe>
