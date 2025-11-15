import { Partition } from "$lib/core/dom";

export type Translation = {
	id: string;
	path: string;
	partition: Partition;
	original: string;
	translated: string;
	createdAt: Date;
};

export type TranslationDump = {
	id: string;
	path: string;
	partition: string;
	original: string;
	translated: string;
	createdAt: Date;
};

export function loadTranslation(dump: TranslationDump): Translation {
	return {
		...dump,
		partition: Partition.parse(dump.partition),
	};
}

export function dumpTranslation(translation: Translation): TranslationDump {
	return {
		...translation,
		partition: translation.partition.toString(),
	};
}
