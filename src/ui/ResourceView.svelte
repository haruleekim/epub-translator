<script lang="ts">
    import type ResourceViewer from "@/core/viewer";

    type Props = {
        path: string;
        resourceViewer: ResourceViewer;
    };
    let { path, resourceViewer }: Props = $props();

    const url = $derived(resourceViewer.getAugmentedContentUrl(path));
</script>

<iframe src={await url} title="Resource Viewer" class="h-full w-full"></iframe>
