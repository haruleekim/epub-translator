<script lang="ts">
    import type { ClassValue } from "svelte/elements";
    import { NodeId } from "@/core/common";
    import * as vdom from "@/utils/virtual-dom";

    type Props = {
        blob: Blob;
        transformUrl?: (url: string) => Promise<string>;
        class?: ClassValue | null | undefined;
    };

    let { blob, transformUrl, class: classValue }: Props = $props();

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

        const promises = [];
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
                            const thisNode = node;
                            const promise = transformUrl(node.attribs[attr]).then((transformed) => {
                                thisNode.attribs[attr] = transformed;
                            });
                            promises.push(promise);
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
        await Promise.all(promises);

        return new Blob([vdom.render(doc, DOM_OPTIONS)], { type: blob.type });
    });

    const url = $derived(transformed.then(URL.createObjectURL));
    $effect(() => {
        url;
        () => url.then(URL.revokeObjectURL);
    });
</script>

<iframe src={await url} title="content-viewer" class={classValue}></iframe>
