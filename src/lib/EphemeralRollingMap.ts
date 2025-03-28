import RollingMap from "./RollingMap.ts";

/**
 * A RollingMap that clears itself and starts over when a new value is set with a different "context", an array of
 * arbitrary values matched against the previous context.
 */
class EphemeralRollingMap<T> {
	#currentContext: any[] = [];
	#rollingMap: RollingMap<T>;

	constructor(maxLength: number) {
		this.#rollingMap = new RollingMap<T>(maxLength);
	}

	#matchesContext(context: any[]) {
		if (context.length !== this.#currentContext.length) return false;
		for (let i = 0; i < context.length; i++) {
			if (context[i] !== this.#currentContext[i]) return false;
		}
		return true;
	}

	get(context: any[], key: any): T | undefined {
		if (this.#matchesContext(context)) {
			return this.#rollingMap.get(key);
		}
		return undefined;
	}

	set(context: any[], key: any, value: T): void {
		if (!this.#matchesContext(context)) {
			this.#rollingMap.clear();
			this.#currentContext = context;
		}
		this.#rollingMap.set(key, value);
	}

	clear(): void {
		this.#rollingMap.clear();
		this.#currentContext = [];
	}
}

export default EphemeralRollingMap;
