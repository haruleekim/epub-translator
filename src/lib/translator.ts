export type ContentId = number[];

export type Partition =
    | {
          type: "full";
          contentId: ContentId;
      }
    | {
          type: "slice";
          contentId: ContentId;
          start: number;
          size: number;
      };

export type Translation = [Partition, string];

export class Translator {
    original: Document;
    translations: Translation[] = [];

    constructor(original: string) {
        this.original = new DOMParser().parseFromString(original, "text/xml");
    }

    getOriginal(contentId: ContentId): Node {
        let node: Node = this.original;
        for (let index = 0; index < contentId.length; index++) {
            node = node.childNodes.item(contentId[index]);
        }
        return node;
    }

    getOriginalChildrenLength(contentId: ContentId): number {
        const node = this.getOriginal(contentId);
        return node.childNodes.length;
    }

    findContainingTranslationIndices(contentId: ContentId): number[] {
        const result = [];
        for (let index = 0; index < this.translations.length; index++) {
            const [partition] = this.translations[index];
            if (!comparePartition({ type: "full", contentId }, partition)) continue;
            if (partition.type === "full" && partition.contentId.length <= contentId.length) {
                result.push(index);
            } else if (
                partition.type === "slice" &&
                partition.contentId.length < contentId.length &&
                contentId[partition.contentId.length] >= partition.start &&
                contentId[partition.contentId.length] < partition.start + partition.size
            ) {
                result.push(index);
            }
        }
        return result;
    }

    registerTranslation(partition: Partition, text: string): string {
        const translation = [partition, text] as Translation;
        const index = binarySearchIndex(this.translations, translation, ([a], [b]) =>
            comparePartition(a, b),
        );
        this.translations.splice(index, 0, translation);
        return text;
    }

    overlapping(): boolean {
        for (let i = 0; i < this.translations.length - 1; i++) {
            const [partition1] = this.translations[i];
            const [partition2] = this.translations[i + 1];
            const result = comparePartition(partition1, partition2);
            if (Number.isNaN(result) || result >= 0) return true;
        }
        return false;
    }
}

export function compareContentId(cid1: ContentId, cid2: ContentId): number {
    for (let i = 0; i < Math.min(cid1.length, cid2.length); i++) {
        if (cid1[i] !== cid2[i]) return cid1[i] - cid2[i];
    }
    if (cid1.length === cid2.length) return 0;
    return NaN;
}

export function comparePartition(p1: Partition, p2: Partition): number {
    if (p1.type === "full" && p2.type === "full") {
        return compareContentId(p1.contentId, p2.contentId);
    } else if (p1.type === "full" && p2.type === "slice") {
        const isLt = compareContentId(p1.contentId, [...p2.contentId, p2.start]);
        if (isLt < 0) return -1;
        const isGt = compareContentId(p1.contentId, [...p2.contentId, p2.start + p2.size - 1]);
        if (isGt > 0) return 1;
        return NaN;
    } else if (p1.type === "slice" && p2.type === "full") {
        return -comparePartition(p2, p1);
    } else if (p1.type === "slice" && p2.type === "slice") {
        const cidCmp = compareContentId(p1.contentId, p2.contentId);
        if (cidCmp === 0 && p1.start === p2.start && p1.size === p2.size) return 0;
        const isLt = compareContentId(
            [...p1.contentId, p1.start + p1.size - 1],
            [...p2.contentId, p2.start],
        );
        if (isLt < 0) return -1;
        const isGt = compareContentId(
            [...p1.contentId, p1.start],
            [...p2.contentId, p2.start + p2.size - 1],
        );
        if (isGt > 0) return 1;
        return NaN;
    }
    return NaN;
}

function binarySearchIndex<T>(array: T[], target: T, compare: (a: T, b: T) => number): number {
    let left = 0;
    let right = array.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const result = compare(array[mid], target);
        if (result < 0) left = mid + 1;
        else if (result > 0) right = mid - 1;
        else return mid;
    }
    return left;
}
