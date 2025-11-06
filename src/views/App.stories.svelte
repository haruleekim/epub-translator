<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import sample from "@/tests/sample.epub?url";
    import App from "./App.svelte";

    const { Story } = defineMeta({
        component: App,
        title: "App",
        args: { defaultInput: sample, defaultPath: "chapter01.xhtml" },
        parameters: { layout: "fullscreen" },
    });
</script>

<Story name="Default" />
