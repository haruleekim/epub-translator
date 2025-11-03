<script lang="ts">
    import { NodeId } from "@/core/composer";
    import Epub from "@/core/epub";
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

    const { epub, spineIndex }: { epub?: Promise<Epub>; spineIndex: number } = $props();
</script>

{#if epub}
    <iframe
        title="EPUB Viewer"
        srcdoc={await createViewerContent(await epub, spineIndex)}
        sandbox="allow-same-origin allow-scripts"
        class="h-full w-full"
    ></iframe>
{/if}
