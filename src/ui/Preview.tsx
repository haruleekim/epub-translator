import { createEffect, createResource, Show, type JSX } from "solid-js";
import Epub from "~/lib/epub";
import { ContentId, Partition } from "~/lib/translator";
import * as vdom from "~/virtual-dom";

const DOM_OPTIONS = { xmlMode: true, decodeEntities: false };
const REFERENCING_ATTRIBUTES = ["src", "href", "xlink:href"];
const CONTENT_ID_ATTRIBUTE = "data-translator-content-id";

export default function Preview(props: { epub: Epub; spineIndex: number }) {
    const [content, actions] = createResource<string, number>(() =>
        createPreviewContent(props.epub, props.spineIndex),
    );

    createEffect(() => {
        props.epub;
        props.spineIndex;
        actions.refetch();
    });

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
        <div class="h-full w-full">
            <Show when={content.error}>
                <div class="alert alert-error">
                    {content.error instanceof Error ? content.error.message : content.error.cause}
                </div>
            </Show>
            <Show
                when={content()}
                fallback={
                    <div class="flex h-full w-full items-center justify-center">
                        <div class="loading loading-spinner" />
                    </div>
                }
            >
                <iframe
                    title="EPUB Viewer"
                    srcdoc={content()}
                    class="h-full w-full"
                    sandbox="allow-same-origin allow-scripts"
                    onLoad={handleFrameLoad}
                />
            </Show>
        </div>
    );
}

async function createPreviewContent(epub: Epub, spineIndex: number): Promise<string> {
    const resource = epub.getSpineItem(spineIndex);
    const content = await resource.getBlob().then((blob) => blob.text());
    const doc = vdom.parseDocument(content, DOM_OPTIONS);

    if (!doc.firstChild) return vdom.render(doc, DOM_OPTIONS);
    let node: vdom.AnyNode = doc.firstChild;
    let contentId = new ContentId([0]);

    while (node.parentNode) {
        if (contentId.leafOrder() >= node.parentNode.childNodes.length) {
            contentId = contentId.parent().sibling(1);
            node = node.parentNode.nextSibling ?? node.parentNode;
            continue;
        }

        if (node instanceof vdom.Element) {
            node.attribs[CONTENT_ID_ATTRIBUTE] = contentId.toString();

            for (const attr of REFERENCING_ATTRIBUTES) {
                const path = node.attribs[attr]
                    ? Epub.resolvePath(node.attribs[attr], resource.path)
                    : null;
                if (!path) continue;
                const referenced = epub.getResource(path);
                if (referenced) node.attribs[attr] = await referenced.getBlobUrl();
            }

            if (node.firstChild) {
                contentId = contentId.firstChild();
                node = node.firstChild;
                continue;
            }
        }

        contentId = contentId.sibling(1);
        node = node.nextSibling ?? node;
    }

    return vdom.render(doc, DOM_OPTIONS);
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
