import type { JSX, Resource } from "solid-js";
import { createEffect, createResource, createSignal, For, Show } from "solid-js";
import Epub from "~/lib/epub";
import { ContentId, Partition } from "~/lib/translator";
import { CONTENT_ID_ATTRIBUTE, createPreviewDocument } from "./converter";

export default function App() {
    const [file, setFile] = createSignal<File>();
    const [epub] = createResource(file, Epub.from);

    return (
        <div class="flex h-screen flex-col">
            <Show when={epub.loading}>
                <progress class="progress m-0 w-full" />
            </Show>
            <Show when={epub.error}>
                <div class="alert alert-error">
                    {epub.error instanceof Error ? epub.error.message : JSON.stringify(epub.error)}
                </div>
            </Show>
            <Show when={epub()}>{(epub) => <Viewer epub={epub()} />}</Show>
            <Uploader onChange={setFile} />
        </div>
    );
}

function Uploader(props: { onChange: (file: File | undefined) => void }) {
    return (
        <label class="btn btn-primary">
            <input
                type="file"
                accept="application/epub+zip"
                hidden
                class="input input-lg"
                onChange={(event) => props.onChange(event.target.files?.[0] ?? undefined)}
            />
            Upload EPUB File
        </label>
    );
}

function Viewer(props: { epub: Epub }) {
    const [spineIndex, setSpineIndex] = createSignal(0);
    const [previewContent, actions] = createResource<string, number>(spineIndex, (spineIndex) =>
        createPreviewDocument(props.epub, spineIndex),
    );

    createEffect(() => {
        props.epub;
        setSpineIndex(0);
        actions.refetch();
    });

    return (
        <div class="flex flex-1 overflow-y-auto">
            <ViewerNavigation
                spine={props.epub.spine}
                index={spineIndex()}
                onNavigate={setSpineIndex}
            />
            <ViewerPreview content={previewContent} />
        </div>
    );
}

function ViewerNavigation(props: {
    index: number;
    spine: readonly string[];
    onNavigate: (index: number) => void;
}) {
    return (
        <nav class="h-full min-w-fit overflow-y-auto text-xs">
            <ul class="list m-2">
                <For each={props.spine}>
                    {(path, index) => (
                        <li>
                            <button
                                type="button"
                                class="w-full link p-0.5 text-justify link-hover"
                                classList={{ "link-accent": index() === props.index }}
                                onClick={() => props.onNavigate(index())}
                            >
                                {path}
                            </button>
                        </li>
                    )}
                </For>
            </ul>
        </nav>
    );
}

function ViewerPreview(props: { content: Resource<string> }) {
    const handleFrameLoad: JSX.EventHandler<HTMLIFrameElement, Event> = (evt) => {
        const contentDocument = evt.currentTarget.contentDocument!;
        contentDocument.addEventListener("selectionchange", function () {
            const selection = this.getSelection();
            if (selection?.rangeCount) {
                const [partition, range] = makePartitionFromRange(selection.getRangeAt(0));
                console.log(partition, range);
            }
        });
    };

    return (
        <main class="h-full flex-1">
            <Show when={props.content.error}>
                <div class="alert alert-error">
                    {props.content.error instanceof Error
                        ? props.content.error.message
                        : JSON.stringify(props.content.error)}
                </div>
            </Show>
            <Show
                when={props.content()}
                fallback={
                    <div class="flex h-full w-full items-center justify-center">
                        <div class="loading loading-spinner" />
                    </div>
                }
            >
                <iframe
                    title="EPUB Viewer"
                    srcdoc={props.content()}
                    class="h-full w-full"
                    sandbox="allow-same-origin allow-scripts"
                    onLoad={handleFrameLoad}
                />
            </Show>
        </main>
    );
}

function makePartitionFromRange(range: Range): [Partition, Range] {
    const { startContainer, endContainer, commonAncestorContainer } = range;
    const startElement = closestAncestorWithContentId(startContainer);
    const endElement = closestAncestorWithContentId(endContainer);
    const commonAncestorElement = closestAncestorWithContentId(commonAncestorContainer);

    let start: Node, end: Node, size: number;
    if (startElement === commonAncestorElement || endElement === commonAncestorElement) {
        [start, end, size] = [commonAncestorElement, commonAncestorElement, 1];
    } else {
        let [s, e] = [startElement, endElement] as [Node, Node];
        while (s.parentNode !== commonAncestorElement) s = s.parentNode!;
        while (e.parentNode !== commonAncestorElement) e = e.parentNode!;
        [start, end, size] = [s, e, 1];
        while (s !== e && size++) s = s.nextSibling!;
    }

    const offset = ContentId.parse((start as HTMLElement).getAttribute(CONTENT_ID_ATTRIBUTE)!);

    const partitionRange = new Range();
    partitionRange.setStartBefore(start);
    partitionRange.setEndAfter(end);

    return [new Partition(offset, size), partitionRange];
}

function closestAncestorWithContentId(node: Node): Element {
    while (
        node.nodeType !== Node.ELEMENT_NODE ||
        (node as Element).getAttribute(CONTENT_ID_ATTRIBUTE) == null
    ) {
        if (!node.parentNode) throw new Error("Cannot find ancestor with content ID");
        node = node.parentNode;
    }
    return node as Element;
}
