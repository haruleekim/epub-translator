import OpenAI, { type ClientOptions } from "openai";
import type { Partition } from "@/core/common";
import type Translator from "@/lib/translator";

/** @returns Translation ID */
export async function translateByOpenAI(
    translator: Translator,
    path: string,
    partition: Partition,
    options: ClientOptions,
): Promise<string> {
    const lang = "Korean";
    const content = await translator.getOriginalContent(path, partition);

    const client = new OpenAI(options);
    const response = await client.responses.create({
        model: "gpt-4o",
        input: content,
        instructions: `
            As a professional translator, translate given HTML snippet into ${lang}, while maintaining the original structure.
            The output should be suitable for replacing the original input in its place without any issues.
            Never surround the output with markup code fence.
        `
            .split("\n")
            .map((line) => line.trim())
            .join("\n"),
    });

    return await translator.addTranslation(path, partition, response.output_text);
}
