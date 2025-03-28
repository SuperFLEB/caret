/**
 * A wrapper around a Map that discards the oldest entries once the maxLength is reached.
 */
class RollingMap<T> {
	maxLength = 20;
	#map = new Map<any, T>();

	constructor(maxLength: number) {
		this.maxLength = maxLength;
	}

	get(key: any): T | undefined {
		return this.#map.get(key);
	}

	set(key: any, value: T): void {
		this.#map.set(key, value);
		if (this.#map.size > this.maxLength) {
			const nextKey = this.#map.keys().next().value;
			if (!nextKey) return;
			this.#map.delete(nextKey);
		}
	}

	delete(key: any): void {
		this.#map.delete(key);
	}

	clear(): void {
		this.#map.clear();
	}
}

export default RollingMap;