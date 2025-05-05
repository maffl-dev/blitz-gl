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

export function loadString(path: string): string {
	const request = new XMLHttpRequest();
	request.open('GET', path, false);  // false makes the request synchronous
	request.send(null);
	if (request.status === 200) {
		return request.responseText;
	} else {
		panic(`Failed to load file: ${path}`);
	}
}