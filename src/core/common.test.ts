import { expect, test } from "vitest";
import { NodeId, Partition } from "@/core/common";

test("parent of the root node is itself", () => {
    const root = new NodeId([]);
    expect(root.parent).toStrictEqual(root);
});

test("a sibling of the root node are itself", () => {
    const root = new NodeId([]);
    expect(root.sibling(1)).toStrictEqual(root);
    expect(root.sibling(-1)).toStrictEqual(root);
});

test("parse node ids", () => {
    expect(NodeId.parse("")).toStrictEqual(new NodeId([]));
    expect(NodeId.parse("1")).toStrictEqual(new NodeId([1]));
    expect(NodeId.parse("1/2")).toStrictEqual(new NodeId([1, 2]));
    expect(NodeId.parse("1/2/3")).toStrictEqual(new NodeId([1, 2, 3]));
});

test("serialize node ids", () => {
    expect(new NodeId([]).toString()).toBe("");
    expect(new NodeId([1]).toString()).toBe("1");
    expect(new NodeId([1, 2]).toString()).toBe("1/2");
    expect(new NodeId([1, 2, 3]).toString()).toBe("1/2/3");
});

test("get common ancestors", () => {
    expect(NodeId.commonAncestor(new NodeId([1, 2, 3]), new NodeId([1, 2, 4]))).toStrictEqual(
        new NodeId([1, 2]),
    );
    expect(NodeId.commonAncestor(new NodeId([1, 2, 3]), new NodeId([1, 2]))).toStrictEqual(
        new NodeId([1, 2]),
    );
    expect(NodeId.commonAncestor(new NodeId([1, 2, 3]), new NodeId([1]))).toStrictEqual(
        new NodeId([1]),
    );
    expect(NodeId.commonAncestor(new NodeId([1, 2, 3]), new NodeId([2]))).toStrictEqual(
        new NodeId([]),
    );
});

test("compare node ids", () => {
    let result: number;

    result = NodeId.compare(new NodeId([1, 1]), new NodeId([1, 2]));
    expect(result).toBeLessThan(0);

    result = NodeId.compare(new NodeId([1, 1]), new NodeId([1, 1]));
    expect(result).toBe(0);

    result = NodeId.compare(new NodeId([1, 1]), new NodeId([1, 0]));
    expect(result).toBeGreaterThan(0);

    result = NodeId.compare(new NodeId([1, 1]), new NodeId([1, 1, 1]));
    expect(result).toBeNaN();
});

test("compare partitions", () => {
    let result: number;

    result = Partition.compare(
        new Partition(new NodeId([1, 2])),
        new Partition(new NodeId([1, 3])),
    );
    expect(result).toBeLessThan(0);

    result = Partition.compare(
        new Partition(new NodeId([1, 2])),
        new Partition(new NodeId([1, 1])),
    );
    expect(result).toBeGreaterThan(0);

    result = Partition.compare(
        new Partition(new NodeId([1, 2])),
        new Partition(new NodeId([1, 2])),
    );
    expect(result).toBe(0);

    result = Partition.compare(
        new Partition(new NodeId([1, 2])),
        new Partition(new NodeId([1, 3])),
    );
    expect(result).toBeLessThan(0);

    result = Partition.compare(
        new Partition(new NodeId([1, 2])),
        new Partition(new NodeId([1, 0]), 2),
    );
    expect(result).toBeGreaterThan(0);

    result = Partition.compare(
        new Partition(new NodeId([1, 0])),
        new Partition(new NodeId([1, 1, 0]), 2),
    );
    expect(result).toBeLessThan(0);

    result = Partition.compare(
        new Partition(new NodeId([1, 1]), 4),
        new Partition(new NodeId([1, 2, 4])),
    );
    expect(result).toBeNaN();
});

test("check if partition contains node id", () => {
    let partition: Partition;

    partition = new Partition(new NodeId([1, 2]));
    expect(partition.contains(new NodeId([1, 2]))).toBe(true);
    expect(partition.contains(new NodeId([1, 3]))).toBe(false);
    expect(partition.contains(new NodeId([1, 2, 3]))).toBe(true);

    partition = new Partition(new NodeId([1, 2]), 2);
    expect(partition.contains(new NodeId([1, 2]))).toBe(true);
    expect(partition.contains(new NodeId([1, 3]))).toBe(true);
    expect(partition.contains(new NodeId([1, 4]))).toBe(false);
    expect(partition.contains(new NodeId([1, 2, 3]))).toBe(true);
});
