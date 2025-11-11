// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Partition } from "$lib/core/dom";

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
		interface PageState {
			path?: string;
			partition?: Partition;
		}
	}
}

export {};
