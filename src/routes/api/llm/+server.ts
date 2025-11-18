import { error } from "@sveltejs/kit";
import OpenAI from "openai";
import * as z from "zod";

type Body = z.infer<typeof Body>;
const Body = z.object({
	instructions: z.string(),
	input: z.string(),
});

export async function POST({ request }) {
	const body: any = await request.json();
	let { instructions, input } = await Body.decodeAsync(body).catch(() => {
		throw error(400, "Invalid request body");
	});

	const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

	const stream = openai.responses.create({
		model: "gpt-5.1",
		reasoning: { effort: "none" },
		text: { verbosity: "high" },
		instructions,
		input,
		stream: true,
	});

	const { readable, writable } = new TransformStream();

	stream.then(async (stream) => {
		const writer = writable.getWriter();
		const encoder = new TextEncoder();
		try {
			for await (const event of stream) {
				if (event.type !== "response.output_text.delta") continue;
				const data = JSON.stringify(event.delta);
				writer.write(encoder.encode(`event: message\ndata: ${data}\n\n`));
			}
			writer.write(encoder.encode(`event: done\ndata: null\n\n`));
			writer.close();
		} catch (error) {
			writer.abort(error);
		}
	});

	return new Response(readable, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}
