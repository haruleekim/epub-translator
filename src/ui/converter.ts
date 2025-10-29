import { render } from "dom-serializer";
import { type AnyNode, Element } from "domhandler";
import { parseDocument } from "htmlparser2";
import Epub from "~/lib/epub";
import { ContentId } from "~/lib/translator";

const DOM_OPTIONS = { xmlMode: true, decodeEntities: false };
const REFERENCING_ATTRIBUTES = ["src", "href", "xlink:href"];
export const CONTENT_ID_ATTRIBUTE = "data-translator-content-id";

export async function createPreviewDocument(epub: Epub, spineIndex: number): Promise<string> {
    const resource = epub.getSpineItem(spineIndex);
    const content = await resource.getBlob().then((blob) => blob.text());
    const doc = parseDocument(content, DOM_OPTIONS);

    if (!doc.firstChild) return render(doc, DOM_OPTIONS);
    let node: AnyNode = doc.firstChild;
    let contentId = new ContentId([0]);

    while (node.parentNode) {
        if (contentId.leafOrder() >= node.parentNode.childNodes.length) {
            contentId = contentId.parent().sibling(1);
            node = node.parentNode.nextSibling ?? node.parentNode;
            continue;
        }

        if (node instanceof Element) {
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

    return render(doc, DOM_OPTIONS);
}
