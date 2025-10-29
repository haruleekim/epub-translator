import cn from "classnames";
import { type ReactEventHandler, useEffect, useState } from "react";
import Epub from "~/lib/epub";
import { usePrevious, usePromise } from "~/utils/hooks";
import { createContentDocument } from "./converter";

export default function App() {
    const [epubPromise, setEpubPromise] = useState<Promise<Epub | null>>(Promise.resolve(null));
    const [epub, error, loading] = usePromise(epubPromise);

    const handleUpload = (file: File | null) => {
        setEpubPromise(file ? Epub.from(file) : Promise.resolve(null));
    };

    return (
        <div className="h-screen flex flex-col">
            {loading ? <progress className="progress w-full m-0" /> : null}
            {error ? (
                <div className="alert alert-error">
                    {error instanceof Error ? error.message : JSON.stringify(error)}
                </div>
            ) : null}
            {epub ? <Viewer epub={epub} /> : null}
            <Uploader onChange={handleUpload} />
        </div>
    );
}

function Uploader(props: { onChange: (file: File | null) => void }) {
    return (
        <label className="btn btn-primary">
            <input
                type="file"
                accept="application/epub+zip"
                hidden
                className="input input-lg"
                onChange={(event) => props.onChange(event.target.files?.[0] ?? null)}
            />
            Upload EPUB File
        </label>
    );
}

function Viewer(props: { epub: Epub }) {
    const prevEpub = usePrevious(props.epub);
    const [spineIndex, setSpineIndex] = useState(0);
    const [content, setContent] = useState<Promise<string>>(() =>
        createContentDocument(props.epub, spineIndex),
    );

    useEffect(() => {
        if (props.epub === prevEpub) {
            setContent(createContentDocument(props.epub, spineIndex));
        } else {
            setSpineIndex(0);
            setContent(createContentDocument(props.epub, 0));
        }
    }, [props.epub, spineIndex]);

    return (
        <div className="flex flex-1 overflow-y-auto">
            <ViewerNavigation
                spine={props.epub.spine}
                index={spineIndex}
                onNavigate={setSpineIndex}
            />
            <ViewerFrame content={content} />
        </div>
    );
}

function ViewerNavigation(props: {
    index: number;
    spine: readonly string[];
    onNavigate: (index: number) => void;
}) {
    return (
        <nav className="text-xs min-w-fit h-full overflow-y-auto">
            <ul className="list m-2">
                {props.spine.map((path, index) => (
                    <li key={path}>
                        <button
                            type="button"
                            className={cn(
                                "w-full p-0.5 text-justify link link-hover",
                                index === props.index ? "link-accent" : null,
                            )}
                            onClick={() => props.onNavigate(index)}
                        >
                            {path}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

function ViewerFrame(props: { content: Promise<string> }) {
    const [content, error, loading] = usePromise(props.content);

    const handleFrameLoad: ReactEventHandler<HTMLIFrameElement> = (evt) => {
        const contentDocument = evt.currentTarget.contentDocument!;
        contentDocument.addEventListener("selectionchange", handleContentSelectionChange);
    };

    return (
        <main className="flex-1 h-full">
            {loading ? (
                <div className="flex items-center justify-center w-full h-full">
                    <div className="loading loading-spinner" />
                </div>
            ) : error ? (
                <div className="alert alert-error">
                    {error instanceof Error ? error.message : JSON.stringify(error)}
                </div>
            ) : (
                <iframe
                    title="EPUB Viewer"
                    srcDoc={content}
                    className="w-full h-full"
                    sandbox="allow-same-origin allow-scripts"
                    onLoad={handleFrameLoad}
                />
            )}
        </main>
    );
}

function handleContentSelectionChange(this: Document) {
    const selection = this.getSelection();
    if (!selection || selection.rangeCount !== 1) return;

    const { startContainer, endContainer, commonAncestorContainer } = selection.getRangeAt(0);

    let start: Node, end: Node, size: number;
    if (startContainer === commonAncestorContainer || endContainer === commonAncestorContainer) {
        [start, end, size] = [commonAncestorContainer, commonAncestorContainer, 1];
    } else {
        let [s, e] = [startContainer, endContainer];
        while (s.parentNode !== commonAncestorContainer) s = s.parentNode!;
        while (e.parentNode !== commonAncestorContainer) e = e.parentNode!;
        [start, end, size] = [s, e, 1];
        while (s !== e && size++) s = s.nextSibling!;
    }

    const range = new Range();
    range.setStartBefore(start);
    range.setEndAfter(end);

    console.log(start, end, size);
}
