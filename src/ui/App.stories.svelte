<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Translator from "@/core/translator";
    import sample from "@/tests/sample.epub?url";
    import App from "./App.svelte";

    const translator = await Translator.load(sample);

    const { Story } = defineMeta({
        component: App,
        parameters: { layout: "fullscreen" },
    });
</script>

<Story name="Default" args={{ translator }} />
