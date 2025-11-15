import { error } from "@sveltejs/kit";
import OpenAI from "openai";
import * as z from "zod";

type Body = z.infer<typeof Body>;
const Body = z.object({
	instructions: z.string(),
	input: z.string(),
});

export async function POST({ request }) {
	const body = await request.json();
	let { instructions, input } = await Body.decodeAsync(body).catch(() => {
		throw error(400, "Invalid request body");
	});

	const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

	const stream = openai.responses.create({
		model: "gpt-4o",
		instructions,
		input,
		stream: true,
	});

	const { readable, writable } = new TransformStream();

	stream.then(async (stream) => {
		const writer = writable.getWriter();
		for await (const event of stream) {
			if (event.type !== "response.output_text.delta") continue;
			await writer.write(`event: message\ndata: ${JSON.stringify(event.delta)}\n\n`);
		}
		await writer.write(`event: done\ndata: null\n\n`);
		writer.releaseLock();
	});

	return new Response(readable, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}
