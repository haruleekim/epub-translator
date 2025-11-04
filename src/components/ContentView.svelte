<script lang="ts">
    import { NodeId } from "@/core/common";
    import * as vdom from "@/utils/virtual-dom";

    type Props = {
        blob: Blob;
        transformUrl?: (url: string) => Promise<string>;
    };

    let { blob, transformUrl }: Props = $props();

    const transformed = $derived.by(async () => {
        const XML_LIKE_MIME_TYPES = [
            "application/xhtml+xml",
            "application/xml",
            "text/xml",
            "text/html",
            "image/svg+xml",
        ];
        const DOM_OPTIONS = { xmlMode: true, decodeEntities: false };
        const REFERENCING_ATTRIBUTES = ["src", "href", "xlink:href"];
        const NODE_ID_ATTRIBUTE = "data-node-id";

        if (!XML_LIKE_MIME_TYPES.includes(blob.type)) return blob;

        const content = await blob.text();
        const doc = vdom.parseDocument(content, DOM_OPTIONS);
        if (!doc.firstChild) return blob;

        let node: vdom.AnyNode = doc.firstChild;
        let nodeId = new NodeId([0]);

        while (node.parentNode) {
            if (nodeId.leafOrder >= node.parentNode.childNodes.length) {
                nodeId = nodeId.parent.sibling(1);
                node = node.parentNode.nextSibling ?? node.parentNode;
                continue;
            }

            if (node instanceof vdom.Element) {
                node.attribs[NODE_ID_ATTRIBUTE] = nodeId.toString();

                if (transformUrl) {
                    for (const attr of REFERENCING_ATTRIBUTES) {
                        if (node.attribs[attr]) {
                            node.attribs[attr] = await transformUrl(node.attribs[attr]);
                        }
                    }
                }

                if (node.firstChild) {
                    nodeId = nodeId.firstChild;
                    node = node.firstChild;
                    continue;
                }
            }

            nodeId = nodeId.sibling(1);
            node = node.nextSibling ?? node;
        }

        return new Blob([vdom.render(doc, DOM_OPTIONS)], { type: blob.type });
    });

    const url = $derived(URL.createObjectURL(await transformed));

    $effect(() => {
        url;
        return () => URL.revokeObjectURL(url);
    });
</script>

<iframe src={url} title="Content View" class="h-full w-full"></iframe>
