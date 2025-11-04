<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import { NodeId, Partition } from "@/core/common";
    import TranslationComposer from "@/core/composer";
    import Translator from "@/core/translator";
    import sample from "@/tests/sample.epub?url";
    import TranslationList from "./TranslationList.svelte";

    const translator = await Translator.load(sample);

    const { Story } = defineMeta({
        component: TranslationList,
        args: { translator, path: "chapter01.xhtml" },
    });
</script>

<Story name="Default" />
