<script lang="ts">
    import type { EventHandler } from "svelte/elements";
    import Epub from "@/core/epub";
    import { NodeId, Partition } from "@/core/translator";
    import * as vdom from "@/utils/virtual-dom";

    const DOM_OPTIONS = { xmlMode: true, decodeEntities: false };
    const REFERENCING_ATTRIBUTES = ["src", "href", "xlink:href"];
    const NODE_ID_ATTRIBUTE = "data-translator-node-id";

    async function createViewerContent(epub: Epub, spineIndex: number): Promise<string> {
        const resource = epub.getSpineItem(spineIndex);
        const content = await resource.getBlob().then((blob) => blob.text());
        const doc = vdom.parseDocument(content, DOM_OPTIONS);

        if (!doc.firstChild) return vdom.render(doc, DOM_OPTIONS);
        let node: vdom.AnyNode = doc.firstChild;
        let id = new NodeId([0]);

        while (node.parentNode) {
            if (id.leafOrder() >= node.parentNode.childNodes.length) {
                id = id.parent().sibling(1);
                node = node.parentNode.nextSibling ?? node.parentNode;
                continue;
            }

            if (node instanceof vdom.Element) {
                node.attribs[NODE_ID_ATTRIBUTE] = id.toString();

                for (const attr of REFERENCING_ATTRIBUTES) {
                    const path = node.attribs[attr]
                        ? Epub.resolvePath(node.attribs[attr], resource.path)
                        : null;
                    if (!path) continue;
                    const referenced = epub.getResource(path);
                    if (referenced) node.attribs[attr] = await referenced.getBlobUrl();
                }

                if (node.firstChild) {
                    id = id.firstChild();
                    node = node.firstChild;
                    continue;
                }
            }

            id = id.sibling(1);
            node = node.nextSibling ?? node;
        }

        return vdom.render(doc, DOM_OPTIONS);
    }

    function makePartitionFromRange(range: Range): [Partition, Range] {
        const { startContainer, endContainer, commonAncestorContainer } = range;
        const startElement = closestAncestorWithNodeId(startContainer);
        const endElement = closestAncestorWithNodeId(endContainer);
        const commonAncestorElement = closestAncestorWithNodeId(commonAncestorContainer);

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

        const offset = NodeId.parse((start as HTMLElement).getAttribute(NODE_ID_ATTRIBUTE)!);

        const partitionRange = new Range();
        partitionRange.setStartBefore(start);
        partitionRange.setEndAfter(end);

        return [new Partition(offset, size), partitionRange];
    }

    function closestAncestorWithNodeId(node: Node): Element {
        while (
            node.nodeType !== Node.ELEMENT_NODE ||
            (node as Element).getAttribute(NODE_ID_ATTRIBUTE) == null
        ) {
            if (!node.parentNode) throw new Error("Cannot find ancestor with node ID");
            node = node.parentNode;
        }
        return node as Element;
    }

    const handleFrameLoad: EventHandler<Event, Element> = (evt) => {
        const contentDocument = (evt.currentTarget as HTMLIFrameElement).contentDocument!;
        contentDocument.addEventListener("selectionchange", function () {
            const selection = this.getSelection();
            if (selection?.rangeCount) {
                const [partition, range] = makePartitionFromRange(selection.getRangeAt(0));
                console.log(partition, range);
            }
        });
    };

    const { epub, spineIndex }: { epub?: Promise<Epub>; spineIndex: number } = $props();
</script>

{#if epub}
    <iframe
        title="EPUB Viewer"
        srcdoc={await createViewerContent(await epub, spineIndex)}
        sandbox="allow-same-origin allow-scripts"
        class="h-full w-full"
        onload={handleFrameLoad}
    ></iframe>
{/if}
