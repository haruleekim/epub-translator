<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import { Translator, NodeId, Partition } from "@/core/translator";
    import TranslationView from "./TranslationView.svelte";

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

    const translator = new Translator(sampleDoc);
    translator.registerTranslation(
        new Partition(new NodeId([2, 0])),
        `<head><title>Mon livre</title><meta charset="utf-8"/></head>`,
    );
    translator.registerTranslation(
        new Partition(new NodeId([2, 1, 0]), 2),
        `<h1>Mon livre</h1><p>Bonjour monde!</p>`,
    );
    translator.registerTranslation(new Partition(new NodeId([2, 1, 2])), `<p>C'est mon livre.</p>`);

    translator.registerTranslation(new Partition(new NodeId([2, 1, 1, 0])), "Bonjour monde!");

    const { Story } = defineMeta({
        title: "TranslationView",
        component: TranslationView,
        tags: ["autodocs"],
        argTypes: {},
        args: { translator },
    });
</script>

<Story name="Default" />
