import cn from "classnames";
import { type ReactEventHandler, useEffect, useState } from "react";
import Epub from "~/lib/epub";
import { ContentId, Partition } from "~/lib/translator";
import { usePrevious, usePromise } from "~/utils/hooks";
import { CONTENT_ID_ATTRIBUTE, createPreviewDocument } from "./converter";

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
        createPreviewDocument(props.epub, spineIndex),
    );

    useEffect(() => {
        if (props.epub === prevEpub) {
            setContent(createPreviewDocument(props.epub, spineIndex));
        } else {
            setSpineIndex(0);
            setContent(createPreviewDocument(props.epub, 0));
        }
    }, [props.epub, spineIndex]);

    return (
        <div className="flex flex-1 overflow-y-auto">
            <ViewerNavigation
                spine={props.epub.spine}
                index={spineIndex}
                onNavigate={setSpineIndex}
            />
            <ViewerPreview content={content} />
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

function ViewerPreview(props: { content: Promise<string> }) {
    const [content, error, loading] = usePromise(props.content);

    const handleFrameLoad: ReactEventHandler<HTMLIFrameElement> = (evt) => {
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
