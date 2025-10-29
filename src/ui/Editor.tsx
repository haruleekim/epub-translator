import { createEffect, createResource } from "solid-js";
import type Epub from "~/lib/epub";

export default function Preview(props: { epub: Epub; spineIndex: number }) {
    const [content, actions] = createResource<string, number>(async () => {
        const resource = props.epub.getSpineItem(props.spineIndex);
        const blob = await resource.getBlob();
        return await blob.text();
    });

    createEffect(() => {
        props.epub;
        props.spineIndex;
        actions.refetch();
    });

    return <div class="flex h-full w-full overflow-auto">{content()}</div>;
}
