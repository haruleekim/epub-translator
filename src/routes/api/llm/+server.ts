import { error } from "@sveltejs/kit";
import { createResponse } from "better-sse";
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

	const stream = await openai.responses.create({
		model: "gpt-4o",
		instructions,
		input,
		stream: true,
	});

	return createResponse(request, async (session) => {
		for await (const event of stream) {
			if (event.type !== "response.output_text.delta") continue;
			session.push(event.delta, "message");
		}
		session.push(null, "done");
	});
}
