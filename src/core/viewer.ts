import PromiseRegistry from "@/utils/promise-registry";
import * as vdom from "@/utils/virtual-dom";
import { NodeId } from "./composer";
import Epub from "./epub";

export default class ResourceViewer {
    #blobMap = new PromiseRegistry<string, Blob>((path) => this.#getAugmentedContent(path));
    #urlMap = new PromiseRegistry<string, string>(
        (path) => this.#getAugmentedContentUrl(path),
        async (_path, promise) => URL.revokeObjectURL(await promise),
    );

    constructor(private epub: Epub) {}

    async getAugmentedContentUrl(path: string): Promise<string> {
        return this.#urlMap.get(path);
    }

    async #getAugmentedContentUrl(path: string): Promise<string> {
        const blob = await this.getAugmentedContent(path);
        return URL.createObjectURL(blob);
    }

    async getAugmentedContent(path: string): Promise<Blob> {
        return this.#blobMap.get(path);
    }

    async #getAugmentedContent(path: string): Promise<Blob> {
        const XML_LIKE_MIME_TYPES = [
            "application/xhtml+xml",
            "application/xml",
            "text/xml",
            "text/html",
            "image/svg+xml",
        ];

        const resource = this.epub.getResource(path);
        const blobPromise = resource.getBlob();

        if (!XML_LIKE_MIME_TYPES.includes(resource.mediaType)) return blobPromise;

        const blob = await blobPromise;
        const content = await blob.text();
        const augmentedContent = await this.#augmentXmlLikeContent(content, path);
        return new Blob([augmentedContent], { type: blob.type });
    }

    async #augmentXmlLikeContent(content: string, resourcePath: string): Promise<string> {
        const DOM_OPTIONS = { xmlMode: true, decodeEntities: false };
        const REFERENCING_ATTRIBUTES = ["src", "href", "xlink:href"];
        const NODE_ID_ATTRIBUTE = "data-node-id";

        const doc = vdom.parseDocument(content, DOM_OPTIONS);
        if (!doc.firstChild) return content;

        let node: vdom.AnyNode = doc.firstChild;
        let nodeId = new NodeId([0]);

        const resourcePaths = this.epub.getResourcePaths();

        while (node.parentNode) {
            if (nodeId.leafOrder() >= node.parentNode.childNodes.length) {
                nodeId = nodeId.parent().sibling(1);
                node = node.parentNode.nextSibling ?? node.parentNode;
                continue;
            }

            if (node instanceof vdom.Element) {
                node.attribs[NODE_ID_ATTRIBUTE] = nodeId.toString();

                for (const attr of REFERENCING_ATTRIBUTES) {
                    const path = node.attribs[attr]
                        ? Epub.resolvePath(node.attribs[attr], resourcePath)
                        : null;
                    if (!path) continue;
                    if (resourcePaths.includes(path)) {
                        node.attribs[attr] = await this.getAugmentedContentUrl(path);
                    }
                }

                if (node.firstChild) {
                    nodeId = nodeId.firstChild();
                    node = node.firstChild;
                    continue;
                }
            }

            nodeId = nodeId.sibling(1);
            node = node.nextSibling ?? node;
        }

        return vdom.render(doc, DOM_OPTIONS);
    }
}
