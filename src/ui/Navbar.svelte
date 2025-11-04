<script lang="ts">
    import type { ClassValue } from "svelte/elements";
    import IconDownload from "virtual:icons/mdi/download";
    import IconEye from "virtual:icons/mdi/eye";
    import IconFileTree from "virtual:icons/mdi/file-tree";
    import IconTranslate from "virtual:icons/mdi/translate";
    import IconUpload from "virtual:icons/mdi/upload";

    export type Mode = "browse" | "translate" | "preview";

    export type Props = {
        class?: ClassValue | undefined | null;
        mode?: Mode;
        onUpload?: () => void;
        onDownload?: () => void;
    };

    let {
        mode = $bindable("browse"),
        onUpload = () => {},
        onDownload = () => {},
    }: Props = $props();
</script>

<div class="navbar justify-between gap-1">
    <ul class="menu menu-horizontal gap-1">
        <li>
            <button class={{ "menu-active": mode === "browse" }} onclick={() => (mode = "browse")}>
                <IconFileTree class="size-4" />
                Browse
            </button>
        </li>
        <li>
            <button
                class={{ "menu-active": mode === "translate" }}
                onclick={() => (mode = "translate")}
            >
                <IconTranslate class="size-4" />
                Translate
            </button>
        </li>
        <li>
            <button
                class={{ "menu-active": mode === "preview" }}
                onclick={() => (mode = "preview")}
            >
                <IconEye class="size-4" />
                Preview
            </button>
        </li>
    </ul>

    <ul class="menu menu-horizontal gap-1">
        <li>
            <button onclick={() => onDownload()}>
                <IconDownload class="size-4" />
                Download
            </button>
        </li>
        <li>
            <button onclick={() => onUpload()}>
                <IconUpload class="size-4" />
                Upload
            </button>
        </li>
    </ul>
</div>
