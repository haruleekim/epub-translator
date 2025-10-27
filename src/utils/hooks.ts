import { useEffect, useRef, useState } from "react";

export function usePromise<T>(promise: Promise<T>): [T | undefined, true] | [T, false] {
    const [value, setValue] = useState<T>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        let canceled = false;
        promise.then((result) => {
            if (!canceled) {
                setValue(result);
                setLoading(false);
            }
        });
        return () => {
            canceled = true;
        };
    }, [promise]);

    return [value, loading] as [T | undefined, true] | [T, false];
}

export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>(undefined);
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}
