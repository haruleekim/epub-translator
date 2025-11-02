<script lang="ts">
    import IconDownload from "virtual:icons/mdi/download";
    import IconEye from "virtual:icons/mdi/eye";
    import IconFileTree from "virtual:icons/mdi/file-tree";
    import IconTranslate from "virtual:icons/mdi/translate";
    import IconUpload from "virtual:icons/mdi/upload";

    export type Mode = "browse" | "translate" | "preview";

    export interface Props {
        mode?: Mode;
        onchange?: (mode: Mode) => void;
        onupload?: () => void;
        ondownload?: () => void;
    }

    const {
        mode = "browse",
        onchange = () => {},
        ondownload = () => {},
        onupload = () => {},
    }: Props = $props();
</script>

<div class="navbar justify-between gap-1 bg-base-200">
    <ul class="menu menu-horizontal gap-1">
        <li>
            <button class={[mode === "browse" && "menu-active"]} onclick={() => onchange("browse")}>
                <IconFileTree class="size-4" />
                Browse
            </button>
        </li>
        <li>
            <button
                class={[mode === "translate" && "menu-active"]}
                onclick={() => onchange("translate")}
            >
                <IconTranslate class="size-4" />
                Translate
            </button>
        </li>
        <li>
            <button
                class={[mode === "preview" && "menu-active"]}
                onclick={() => onchange("preview")}
            >
                <IconEye class="size-4" />
                Preview
            </button>
        </li>
    </ul>

    <ul class="menu menu-horizontal gap-1 bg-base-200">
        <li>
            <button onclick={() => ondownload()}>
                <IconDownload class="size-4" />
                Download
            </button>
        </li>
        <li>
            <button onclick={() => onupload()}>
                <IconUpload class="size-4" />
                Upload
            </button>
        </li>
    </ul>
</div>
