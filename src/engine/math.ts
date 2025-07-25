
export interface Rect {
	x: number
	y: number
	w: number
	h: number
}

export function clamp(n: number, min: number, max: number): number {
	return Math.max(min, Math.min(n, max));
}