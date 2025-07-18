// r, g, b, a
export type Color = [number, number, number, number];

// Colors
export const white = rgba(1, 1, 1);
export const black = rgba(0, 0, 0);
export const red = rgba(1, 0, 0);
export const green = rgba(0, 1, 0);
export const blue = rgba(0, 0, 1);
export const semiGreen = hex("0f0", 0.5);

// Functions
export function rgba(r: number, g: number, b: number, a: number = 1): Color {
	return [r, g, b, a] as const;
}

export function rgba255(r: number, g: number, b: number, a: number = 1): Color {
	return [r / 255, g / 255, b / 255, a] as const;
}

// e.g. "#ff0000", "0f0" + optional alpha
export function hex(hex: string, alpha: number = 1): Color {
	const parsed = hex.startsWith('#') ? hex.slice(1) : hex;
	const bigint = parseInt(parsed, 16);

	let r = 0, g = 0, b = 0;

	if (parsed.length === 6) {
		r = (bigint >> 16) & 255;
		g = (bigint >> 8) & 255;
		b = bigint & 255;
	} else if (parsed.length === 3) {
		r = ((bigint >> 8) & 0xF) * 17;
		g = ((bigint >> 4) & 0xF) * 17;
		b = (bigint & 0xF) * 17;
	} else {
		throw new Error(`Invalid hex color: "${hex}"`);
	}

	return [r / 255, g / 255, b / 255, alpha] as const;
}
