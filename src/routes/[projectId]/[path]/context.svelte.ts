import { createContext } from "svelte";
import type { Partition } from "$lib/core/dom";

export default class Context {
	partition: Partition | null = $state(null);
}

export const [getContext, setContext] = createContext<Context>();
