import cn from "classnames";
import { type ReactEventHandler, useEffect, useState } from "react";
import Epub from "~/lib/epub";
import { usePrevious, usePromise } from "~/utils/hooks";

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
    const [index, setIndex] = useState(0);
    const [contentUrl, setContentUrl] = useState<Promise<string>>(() =>
        props.epub.getContentVirtualUrl(index),
    );

    useEffect(() => {
        if (props.epub === prevEpub) {
            setContentUrl(props.epub.getContentVirtualUrl(index));
        } else {
            setIndex(0);
            setContentUrl(props.epub.getContentVirtualUrl(0));
        }
    }, [props.epub, index]);

    return (
        <div className="flex flex-1 overflow-y-auto">
            <ViewerNavigation index={index} spine={props.epub.spine} onNavigate={setIndex} />
            <ViewerFrame url={contentUrl} />
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

function ViewerFrame(props: { url: Promise<string> }) {
    const [url, error, loading] = usePromise(props.url);

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
                    src={url}
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

    const range = selection.getRangeAt(0);
    const { startContainer, endContainer, commonAncestorContainer } = range;

    let offset: Node, size: number;
    if (startContainer === commonAncestorContainer || endContainer === commonAncestorContainer) {
        [offset, size] = [commonAncestorContainer, 1];
    } else {
        let [s, e] = [startContainer, endContainer];
        while (s.parentNode !== commonAncestorContainer) s = s.parentNode!;
        while (e.parentNode !== commonAncestorContainer) e = e.parentNode!;
        [offset, size] = [s, 1];
        while (s !== e && size++) s = s.nextSibling!;
    }

    console.log(offset, size);
}
