import { useEffect, useRef, useState } from "react";

type PromiseState<T, E> = [T | undefined, E | undefined, boolean];
export function usePromise<T, E = unknown>(promise: Promise<T>): PromiseState<T, E> {
    const [result, setResult] = useState<T>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<E | undefined>();

    useEffect(() => {
        setLoading(true);
        setError(undefined);
        let canceled = false;
        promise
            .then((result) => {
                if (!canceled) {
                    setResult(result);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (!canceled) {
                    setError(err);
                    setLoading(false);
                }
            });
        return () => {
            canceled = true;
        };
    }, [promise]);

    return [result, error, loading] as PromiseState<T, E>;
}

export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>(undefined);
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}
