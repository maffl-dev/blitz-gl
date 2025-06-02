import { Rect } from "./math"
import { Texture } from "./renderer"
import { assert, panic } from "./utils"

export const TILESIZE = 20

export enum TileDirection {
	Up = 1,
	Right = 2,
	Down = 4,
	Left = 8,
	All = 15
}

export enum LayerType {
	Normal,
	Autotiles,
	Collision,
	Zone
}

export enum TileID {
	Empty = -1,
	Undefined = -2,
	Occupied = 1024
}

export class TileLayer {
	private w: number
	private h: number
	private tiles: number[]
	private _type: LayerType

	constructor(w: number, h: number, type: LayerType) {
		this.w = w
		this.h = h
		this._type = type;
		this.tiles = new Array(w * h)
		this.fill(this.emptyTile())
	}

	emptyTile(): number {
		return TileID.Empty
	}

	get width(): number {
		return this.w;
	}

	get height(): number {
		return this.h;
	}

	get type(): number {
		return this._type;
	}

	fill(id: number): void {
		for (let index = 0; index < this.tiles.length; index++) {
			this.tiles[index] = id
		}
	}

	setTile(x: number, y: number, id: number): void {
		const index: number = y * this.w + x
		this.setTileIndex(index, id)
	}

	setTileIndex(index: number, id: number): void {
		if (index < 0 || index >= this.tiles.length) return;
		this.tiles[index] = id
	}

	tileAt(x: number, y: number): number {
		const index: number = y * this.w + x
		assert(index >= 0 && index < this.tiles.length, "tileAt(" + x + "," + y + ") is out of bounds.")
		return this.tiles[index]
	}

	tileAtIndex(index: number): number {
		return this.tiles[index]
	}

	decodeRLE(data: string): void {
		const delimiter = " ";
		const ids = data.trim().split(delimiter);
		let index = 0;
		let breakout = false;

		for (let i = 0; i < ids.length; i++) {
			if (ids[i][0] === "x") {
				let times = parseInt(ids[i].substring(1));
				let nr = parseInt(ids[i + 1]);
				if (index + times > this.tiles.length) {
					times = this.tiles.length - index;
					breakout = true;
				}
				for (let j = 0; j < times; j++) {
					this.tiles[index + j] = nr;
				}
				if (breakout) break;
				index += times;
				i += 1;
			} else {
				this.tiles[index] = parseInt(ids[i]);
				index += 1;
			}
		}
	}

}

export class Autotile {
	TL: Rect[]
	TR: Rect[]
	BL: Rect[]
	BR: Rect[]
	full: Rect
	island: Rect

	constructor(baseX: number, baseY: number) {
		const half = TILESIZE / 2
		const frames: Rect[] = new Array(24)

		for (let i = 0; i < frames.length; i++) {
			const col = i % 4
			const row = Math.floor(i / 4)
			frames[i] = {
				x: baseX + col * half,
				y: baseY + row * half,
				w: half,
				h: half
			}
		}

		this.island = { x: baseX, y: baseY, w: TILESIZE, h: TILESIZE }
		this.full = { x: baseX + half, y: baseY + half * 3, w: TILESIZE, h: TILESIZE }

		this.TL = [frames[8], frames[10], frames[16], frames[2], frames[18]]
		this.TR = [frames[11], frames[19], frames[9], frames[3], frames[17]]
		this.BL = [frames[20], frames[12], frames[22], frames[6], frames[14]]
		this.BR = [frames[23], frames[21], frames[15], frames[7], frames[13]]
	}
}

export function createAutotilesFromTexture(tex: Texture): Autotile[] {
	const AUTOTILE_TILES_WIDTH = 2
	const AUTOTILE_TILES_HEIGHT = 3
	const autotilesetWidth = TILESIZE * AUTOTILE_TILES_WIDTH
	const autotilesetHeight = TILESIZE * AUTOTILE_TILES_HEIGHT

	if (tex.width % autotilesetWidth !== 0 || tex.height % autotilesetHeight !== 0) {
		panic("Autotile texture size must be multiple of autotile block size")
	}

	const tilesX = tex.width / autotilesetWidth
	const tilesY = tex.height / autotilesetHeight
	const out: Autotile[] = new Array(tilesX * tilesY);

	for (let y = 0; y < tilesY; y++) {
		for (let x = 0; x < tilesX; x++) {
			const index = y * tilesX + x;
			const baseX = x * autotilesetWidth
			const baseY = y * autotilesetHeight
			out[index] = new Autotile(baseX, baseY)
		}
	}

	return out
}

export enum Minitile {
	BottomRight = 0,
	BottomLeft = 8,
	TopRight = 16,
	TopLeft = 24
}

export function packMinitile(tl: number, tr: number, bl: number, br: number): number {
	return (tl << Minitile.TopLeft) | (tr << Minitile.TopRight) | (bl << Minitile.BottomLeft) | br
}

export function unpackMinitile(packed: number, minitile: Minitile): number {
	return (packed >> minitile) & 0xFF
}

export function unpackMinitiles(packed: number): { tl: number, tr: number, bl: number, br: number } {
	return {
		tl: unpackMinitile(packed, Minitile.TopLeft),
		tr: unpackMinitile(packed, Minitile.TopRight),
		bl: unpackMinitile(packed, Minitile.BottomLeft),
		br: unpackMinitile(packed, Minitile.BottomRight),
	}
}

export function calcMinitiles(layer: TileLayer, x: number, y: number, id: number): number {
	let tl = 0, tr = 0, bl = 0, br = 0;
	const w = layer.width;
	const h = layer.height;

	// top
	if (y > 0 && layer.tileAt(x, y - 1) === id) {
		tl += 2;
		tr += 1;
	}

	// bottom
	if (y + 1 <= h - 1 && layer.tileAt(x, y + 1) === id) {
		bl += 1;
		br += 2;
	}

	// left
	if (x > 0 && layer.tileAt(x - 1, y) === id) {
		tl += 1;
		bl += 2;
	}

	// right
	if (x + 1 <= w - 1 && layer.tileAt(x + 1, y) === id) {
		tr += 2;
		br += 1;
	}

	// top-left
	if (y > 0 && x > 0 && layer.tileAt(x - 1, y) === id && layer.tileAt(x - 1, y - 1) === id && tl === 3) {
		tl = 4;
	}

	// top-right
	if (y > 0 && x + 1 <= w - 1 && layer.tileAt(x + 1, y) === id && layer.tileAt(x + 1, y - 1) === id && tr === 3) {
		tr = 4;
	}

	// bottom-left
	if (y + 1 <= h - 1 && x > 0 && layer.tileAt(x - 1, y) === id && layer.tileAt(x - 1, y + 1) === id && bl === 3) {
		bl = 4;
	}

	// bottom-right
	if (y + 1 <= h - 1 && x + 1 <= w - 1 && layer.tileAt(x + 1, y) === id && layer.tileAt(x + 1, y + 1) === id && br === 3) {
		br = 4;
	}

	// map edges => no autotiling
	if (y === 0) {
		tl = 4;
		tr = 4;
		if (layer.tileAt(Math.min(x + 1, w - 1), y) !== id) tr = 1;
		else if (layer.tileAt(Math.max(x - 1, 0), y) !== id) tl = 2;
	} else if (y >= h - 1) {
		bl = 4;
		br = 4;
		if (layer.tileAt(Math.min(x + 1, w - 1), y) !== id) br = 2;
		else if (layer.tileAt(Math.max(x - 1, 0), y) !== id) bl = 1;
	}

	if (x === 0) {
		tl = 4;
		bl = 4;
		if (layer.tileAt(x, Math.max(y - 1, 0)) !== id) tl = 1;
		else if (layer.tileAt(x, Math.min(y + 1, h - 1)) !== id) bl = 2;
	} else if (x >= w - 1) {
		tr = 4;
		br = 4;
		if (layer.tileAt(x, Math.max(y - 1, 0)) !== id) tr = 2;
		else if (layer.tileAt(x, Math.min(y + 1, h - 1)) !== id) br = 1;
	}

	return packMinitile(tl, tr, bl, br);
}

