import _ from "lodash";

export class NodeId {
    readonly path: readonly number[];

    constructor(path: readonly number[]) {
        this.path = [...path];
    }

    static parse(text: string): NodeId {
        if (text === "") return new NodeId([]);
        const parts = text.split("/");
        return new NodeId(parts.map(Number));
    }

    toString(): string {
        return this.path.join("/");
    }

    get length() {
        return this.path.length;
    }

    get leafOrder(): number {
        return this.path[this.path.length - 1];
    }

    sibling(relativePosition: number): NodeId {
        const path = _.initial(this.path);
        if (this.path.length) path.push(this.path[this.path.length - 1] + relativePosition);
        return new NodeId(path);
    }

    get parent(): NodeId {
        return new NodeId(_.initial(this.path));
    }

    get firstChild(): NodeId {
        return new NodeId([...this.path, 0]);
    }

    equals(other: NodeId): boolean {
        return _.isEqual(this.path, other.path);
    }

    static commonAncestor(cid1: NodeId, cid2: NodeId): NodeId {
        const path = [];
        for (let i = 0; i < Math.min(cid1.path.length, cid2.path.length); i++) {
            if (cid1.path[i] !== cid2.path[i]) break;
            path.push(cid1.path[i]);
        }
        return new NodeId(path);
    }

    static compare(cid1: NodeId, cid2: NodeId): number {
        for (let i = 0; i < Math.min(cid1.path.length, cid2.path.length); i++) {
            if (cid1.path[i] !== cid2.path[i]) return cid1.path[i] - cid2.path[i];
        }
        if (cid1.path.length === cid2.path.length) return 0;
        return NaN;
    }

    static totalOrderCompare(cid1: NodeId, cid2: NodeId): number {
        for (let i = 0; i < Math.min(cid1.path.length, cid2.path.length); i++) {
            if (cid1.path[i] !== cid2.path[i]) return cid1.path[i] - cid2.path[i];
        }
        return cid1.path.length - cid2.path.length;
    }
}

export class Partition {
    constructor(
        private readonly offset: NodeId,
        readonly size: number = 1,
    ) {
        if (size <= 0) throw new Error("Size must be positive");
    }

    toString(): string {
        return `${this.offset.toString()}-${this.last.leafOrder}`;
    }

    get first(): NodeId {
        return this.offset;
    }

    get last(): NodeId {
        return this.offset.sibling(this.size - 1);
    }

    contains(id: NodeId): boolean {
        let s = NodeId.compare(this.first, id);
        let e = NodeId.compare(this.last, id);
        if (Number.isNaN(s)) s = this.first.path.length - id.path.length;
        if (Number.isNaN(e)) e = id.path.length - this.last.path.length;
        return s <= 0 && 0 <= e;
    }

    static checkOverlap(partitions: Partition[], skipSort: boolean = false): boolean {
        if (!skipSort) partitions = [...partitions].sort();
        for (let i = 0; i < partitions.length - 1; i++) {
            const a = partitions[i];
            const b = partitions[i + 1];
            const result = Partition.compare(a, b);
            if (Number.isNaN(result) || result >= 0) return true;
        }
        return false;
    }

    static compare(p1: Partition, p2: Partition): number {
        if (_.isEqual(p1.offset, p2.offset) && p1.size === p2.size) return 0;
        if (NodeId.compare(p1.last, p2.first) < 0) return -1;
        if (NodeId.compare(p1.first, p2.last) > 0) return 1;
        return NaN;
    }

    static totalOrderCompare(p1: Partition, p2: Partition): number {
        return NodeId.totalOrderCompare(p1.offset, p2.offset) || p1.size - p2.size;
    }
}

export interface Translation {
    id: string;
    partition: Partition;
    content: string;
}
