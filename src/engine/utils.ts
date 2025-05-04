export function panic(message: string): never {
	throw new Error(message)
}

export function assert(condition: any, message: string = "Assertion failed"): asserts condition {
	if (!condition) {
		throw new Error(message)
	}
}

export function clamp(n: number, min: number, max: number): number {
	return Math.max(min, Math.min(n, max));
}