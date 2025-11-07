export default class PromiseRegistry<K, V> {
    private registry: Map<K, Promise<V>> = new Map();

    constructor(
        private getter: (key: K) => Promise<V>,
        private disposer?: (key: K, promise: Promise<V>) => Promise<void>,
    ) {}

    async get(key: K): Promise<V> {
        const cached = this.registry.get(key);
        if (cached) return cached;

        const { port1: tx, port2: rx } = new MessageChannel();

        let result: V | unknown;

        const promise = new Promise<V>((resolve, reject) => {
            rx.addEventListener("message", (event) => {
                if (event.data) {
                    resolve(result as V);
                } else {
                    reject(result as unknown);
                }
            });
            rx.start();
        });

        this.registry.set(key, promise);

        try {
            result = await this.getter(key);
            tx.postMessage(true);
            return result as V;
        } catch (error) {
            result = error;
            tx.postMessage(false);
            throw result as unknown;
        }
    }

    async clear(): Promise<void> {
        if (this.disposer) {
            const promises = [];
            for (const [key, promise] of this.registry.entries()) {
                promises.push(this.disposer(key, promise));
            }
            this.registry.clear();
            await Promise.all(promises);
        } else {
            this.registry.clear();
        }
    }

    async [Symbol.asyncDispose]() {
        await this.clear();
    }
}
