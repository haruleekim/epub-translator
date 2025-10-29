import { createResource, createSignal, For, Show } from "solid-js";
import Epub from "~/lib/epub";
import Preview from "./Preview";

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
                    {epub.error instanceof Error ? epub.error.message : epub.error.cause}
                </div>
            </Show>
            <Show when={epub()}>{(epub) => <Viewer epub={epub()} />}</Show>
            <label class="btn btn-primary">
                <input
                    type="file"
                    accept="application/epub+zip"
                    hidden
                    class="input input-lg"
                    onChange={(event) => setFile(event.target.files?.[0] ?? undefined)}
                />
                Upload EPUB File
            </label>
        </div>
    );
}

function Viewer(props: { epub: Epub }) {
    const [spineIndex, setSpineIndex] = createSignal(0);

    return (
        <div class="flex flex-1 overflow-y-auto">
            <nav class="h-full min-w-fit overflow-y-auto text-xs">
                <SpineNavigation
                    spine={props.epub.spine}
                    index={spineIndex()}
                    onNavigate={setSpineIndex}
                />
            </nav>
            <main class="h-full flex-1">
                <Preview epub={props.epub} spineIndex={spineIndex()} />
            </main>
        </div>
    );
}

function SpineNavigation(props: {
    index: number;
    spine: readonly string[];
    onNavigate: (index: number) => void;
}) {
    return (
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
    );
}
