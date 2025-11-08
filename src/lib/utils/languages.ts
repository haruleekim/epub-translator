import langs, { type Language as Lang } from "langs";

export interface Language {
	readonly code: string;
	readonly name: string;
	readonly localName: string;
}

export const ALL_LANGUAGES: readonly Language[] = langs.all().map((lang) => ({
	code: lang[2],
	name: lang.name,
	localName: lang.local,
}));

export function getLanguage(code: string): Language | null {
	if (!code) return null;
	let lang: Lang | undefined;
	if (code.length === 2) {
		lang = langs.where("1", code);
	} else if (code.length === 3) {
		lang = langs.where("2", code);
	} else {
		return null;
	}
	if (!lang) return null;
	return {
		code: lang[2],
		name: lang.name,
		localName: lang.local,
	};
}
