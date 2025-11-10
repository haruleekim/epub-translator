<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import { Dom } from "$lib/core/dom";
	import * as vdom from "$lib/utils/virtual-dom";

	type Props = {
		data: Blob | string;
		mediaType?: string;
		transformUrl?: (url: string) => Promise<string>;
		class?: ClassValue | null | undefined;
	};

	let { data, mediaType, transformUrl, class: classValue }: Props = $props();
	if (!mediaType && data instanceof Blob) mediaType = data.type;

	const transformed = $derived.by(async () => {
		[data, mediaType, transformUrl];

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

		if (!mediaType || !XML_LIKE_MIME_TYPES.includes(mediaType)) {
			return new Blob([data], { type: mediaType });
		}

		const content = data instanceof Blob ? await data.text() : data;
		const dom = await Dom.loadAsync(content);

		const promises: Promise<void>[] = [];
		const doc = dom.traverse(({ node, nodeId, close }) => {
			if (close || !(node.type === "tag")) return;
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
		});
		await Promise.all(promises);

		return new Blob([vdom.render(doc, DOM_OPTIONS)], { type: mediaType });
	});

	const url = $derived(transformed.then(URL.createObjectURL));
	$effect(() => {
		url;
		() => url.then(URL.revokeObjectURL);
	});
</script>

<iframe
	src={await url}
	title="content-viewer"
	sandbox="allow-scripts allow-same-origin"
	class={classValue}
></iframe>
