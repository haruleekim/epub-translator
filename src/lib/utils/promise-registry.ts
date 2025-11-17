export default class PromiseRegistry<K, V> {
	private registry: Map<K, Promise<V>> = new Map();

	constructor(
		private getter: (key: K) => Promise<V>,
		private disposer?: (key: K, promise: Promise<V>) => Promise<void>,
	) {}

	async get(key: K): Promise<V> {
		const cached = this.registry.get(key);
		if (cached) return cached;

		let resolve: any, reject: any;
		const promise = new Promise<V>((resolve_, reject_) => {
			[resolve, reject] = [resolve_, reject_];
		});

		this.registry.set(key, promise);

		try {
			const result = await this.getter(key);
			resolve(result);
			return result;
		} catch (error) {
			reject(error);
			throw error;
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
