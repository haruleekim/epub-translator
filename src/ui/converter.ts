import * as CSS from "css-select";
import { render } from "dom-serializer";
import type { Element, Node } from "domhandler";
import { parseDocument } from "htmlparser2";
import Epub from "~/lib/epub";

const DOM_OPTIONS = { xmlMode: true, decodeEntities: false };

const REFERENCING_ATTRIBUTES = ["src", "href", "xlink:href"];
const REFERENCING_ELEMENTS_SELECTOR = CSS.compile(
    REFERENCING_ATTRIBUTES.map((attr) => `*[${attr.replace(":", "\\:")}]`).join(", "),
);

export async function createContentDocument(epub: Epub, spineIndex: number): Promise<string> {
    const resource = epub.getSpineItem(spineIndex);
    const content = await resource.getBlob().then((blob) => blob.text());
    const doc = parseDocument(content, DOM_OPTIONS);

    for (const element of CSS.selectAll<Node, Element>(
        REFERENCING_ELEMENTS_SELECTOR,
        doc,
        DOM_OPTIONS,
    )) {
        for (const attr of REFERENCING_ATTRIBUTES) {
            const path = element.attribs[attr]
                ? Epub.resolvePath(element.attribs[attr], resource.path)
                : null;
            if (path) {
                const referencedResource = epub.getResource(path);
                if (referencedResource) {
                    element.attribs[attr] = await referencedResource.getBlobUrl();
                }
            }
        }
    }

    return render(doc, DOM_OPTIONS);
}
