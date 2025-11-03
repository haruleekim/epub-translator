import { NodeId } from "@/core/composer";
import Epub from "@/core/epub";
import * as vdom from "@/utils/virtual-dom";

const DOM_OPTIONS = { xmlMode: true, decodeEntities: false };
const REFERENCING_ATTRIBUTES = ["src", "href", "xlink:href"];

export type NodeView =
    | {
          type: "document";
          id: NodeId;
          children: NodeView[];
      }
    | {
          type: "element";
          id: NodeId;
          tagName: string;
          attributes: Record<string, string>;
          children: NodeView[];
      }
    | {
          type: "text";
          id: NodeId;
          text: string;
      }
    | {
          type: "unknown";
          id: NodeId;
      };

export async function createNodeView(epub: Epub, spineIndex: number): Promise<NodeView> {
    const resource = epub.getSpineItem(spineIndex);
    const content = await resource.getBlob().then((blob) => blob.text());
    const doc = vdom.parseDocument(content, DOM_OPTIONS);

    async function makeNodeView(node: vdom.AnyNode, id: NodeId): Promise<NodeView> {
        if (node instanceof vdom.Document) {
            const children: NodeView[] = [];
            let childId = id.firstChild();
            for (const child of node.childNodes) {
                children.push(await makeNodeView(child, childId));
                childId = childId.sibling(1);
            }
            return { type: "document", id, children };
        } else if (node instanceof vdom.Element) {
            const children: NodeView[] = [];
            let childId = id.firstChild();
            for (const child of node.childNodes) {
                children.push(await makeNodeView(child, childId));
                childId = childId.sibling(1);
            }
            const tagName = node.tagName;
            const attributes = node.attribs;
            for (const attr of REFERENCING_ATTRIBUTES) {
                const path = attributes[attr]
                    ? Epub.resolvePath(node.attribs[attr], resource.path)
                    : null;
                if (!path) continue;
                const referenced = epub.getResource(path);
                if (referenced) attributes[attr] = await referenced.getBlobUrl();
            }
            return { type: "element", id, tagName, attributes, children };
        } else if (node instanceof vdom.Text) {
            return { type: "text", id, text: node.data };
        } else {
            return { type: "unknown", id };
        }
    }

    return await makeNodeView(doc, new NodeId([]));
}
