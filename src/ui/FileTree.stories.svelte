<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import FileTree from "./FileTree.svelte";

    const { Story } = defineMeta({
        component: FileTree,
    });
</script>

<Story
    name="Default"
    args={{
        paths: [
            "resume.pdf",
            "My Files/Project-final.psd",
            "My Files/Project-final-2.psd",
            "Images/Screenshot1.png",
            "Images/Screenshot2.png",
            "Images/Others/Screenshot3.png",
            "reports-final-2.pdf",
        ],
        onselect: (path) => console.log(path),
    }}
/>

<Story name="Empty" />
