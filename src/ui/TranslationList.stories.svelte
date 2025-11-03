<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import { TranslationComposer, NodeId, Partition } from "@/core/composer";
    import TranslationList from "./TranslationList.svelte";

    const sampleDoc: string = `<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
        <head>
            <title>My Book</title>
            <meta charset="utf-8"/>
        </head>
        <body>
            <h1>My Book</h1>
            <p>Hello world!</p>
            <p>This is my book.</p>
        </body>
        </html>`
        .split("\n")
        .map((line) => line.trim())
        .join("");

    const composer = new TranslationComposer(sampleDoc);
    composer.registerTranslation(
        new Partition(new NodeId([2, 0])),
        `<head><title>Mon livre</title><meta charset="utf-8"/></head>`,
    );
    composer.registerTranslation(
        new Partition(new NodeId([2, 1, 0]), 2),
        `<h1>Mon livre</h1><p>Bonjour monde!</p>`,
    );
    composer.registerTranslation(new Partition(new NodeId([2, 1, 2])), `<p>C'est mon livre.</p>`);

    composer.registerTranslation(new Partition(new NodeId([2, 1, 1, 0])), "Bonjour monde!");

    const { Story } = defineMeta({
        component: TranslationList,
        args: { translator: composer },
    });
</script>

<Story name="Default" />
