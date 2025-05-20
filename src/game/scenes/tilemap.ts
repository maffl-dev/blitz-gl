import { Color, white } from "@/engine/colors";
import { Texture, Renderer } from "@/engine/renderer";
import { Scene } from "@/engine/scene";
import { Autotile, calcMinitiles, createAutotilesFromTexture, TileID, TileLayer, TILESIZE, unpackMinitiles } from "@/engine/tiles";
import { echo, panic } from "@/engine/utils";

class Tilemap extends Scene {
	time: number = 0.0;

	layers!: TileLayer[]
	autotiles!: Autotile[]
	texAutotiles!: Texture
	texTiles!: Texture

	async init(r: Renderer): Promise<void> {
		echo("init tilemap");

		this.texAutotiles = await r.loadTex("tilesets/autotiles.png")
		this.texTiles = await r.loadTex("tilesets/cave.png")
		this.initMap();
	}

	initMap(): void {
		const nrOfLayers = 1 + 6
		this.layers = new Array(nrOfLayers)
		for (let i = 0; i < this.layers.length; i++) {
			this.layers[i] = new TileLayer(17, 11)
		}
		// autotiles
		this.layers[0].decodeRLE("x24 28 x3 17 x14 28 x3 17 x9 28 x8 17 x9 28 x8 17 x9 28 x8 17 x9 28 x8 17 x9 28 x7 17 x59 28")

		// normal layers
		this.layers[1].decodeRLE("x24 -1 54 283 52 x14 -1 79 308 77 x9 -1 65 53 66 67 54 104 333 102 x9 -1 x2 78 91 78 79 x12 -1 x2 103 116 103 104 x95 -1")
		this.layers[2].decodeRLE("x58 -1 100 x29 -1 100 x38 -1 125 x59 -1")
		this.layers[3].decodeRLE("x187 -1")
		this.layers[4].decodeRLE("x8 -1 140 x102 -1 130 156 x7 -1 155 x7 131 156 0 x7 -1 0 x7 -1 0 x11 -1 0 x3 -1 0 x25 -1")
		this.layers[5].decodeRLE("x187 -1")
		this.layers[6].decodeRLE("x187 -1")

		this.autotiles = createAutotilesFromTexture(this.texAutotiles);
	}

	update(dt: number): void {
		this.time += dt;
	}

	render(r: Renderer): void {
		r.setColor(...white)
		for (let i = 0; i < this.layers.length; i++) {
			const layer = this.layers[i]
			if (i === 0) {
				this.drawAutotiles(r, layer, this.texAutotiles)
			} else {
				this.drawLayer(r, layer, this.texTiles)
			}
		}
	}

	drawLayer(r: Renderer, layer: TileLayer, tileset: Texture): void {
		const viewStartX: number = 0
		const viewStartY: number = 0
		const viewWidth: number = layer.width
		const viewHeight: number = layer.height
		const tilesetWidth: number = tileset.width / TILESIZE

		for (let y = viewStartY; y < viewHeight; y++) {
			for (let x = viewStartX; x < viewWidth; x++) {
				const id = layer.tileAt(x, y)
				if (id === TileID.Empty) continue
				const posX = x * TILESIZE
				const posY = y * TILESIZE
				const sourceX = (id % tilesetWidth) * TILESIZE
				const sourceY = Math.floor(id / tilesetWidth) * TILESIZE
				r.drawTexRect(tileset, posX, posY, sourceX, sourceY, TILESIZE, TILESIZE)
			}
		}
	}

	drawAutotiles(r: Renderer, layer: TileLayer, tileset: Texture): void {
		const viewStartX: number = 0
		const viewStartY: number = 0
		const viewWidth: number = layer.width
		const viewHeight: number = layer.height

		for (let y = viewStartY; y < viewHeight; y++) {
			for (let x = viewStartX; x < viewWidth; x++) {
				const id = layer.tileAt(x, y)
				if (id === TileID.Empty) continue
				const packed = calcMinitiles(layer, x, y, id)
				this.drawAutotile(r, x, y, this.autotiles[id], packed, tileset)
			}
		}
	}

	drawAutotile(r: Renderer, x: number, y: number, autotile: Autotile, packed: number, tileset: Texture) {
		const half = TILESIZE / 2
		const { tl, tr, bl, br } = unpackMinitiles(packed);

		r.drawTexRect(
			tileset,
			x * TILESIZE,
			y * TILESIZE,
			autotile.TL[tl].x, autotile.TL[tl].y, autotile.TL[tl].w, autotile.TL[tl].h
		)
		r.drawTexRect(
			tileset,
			x * TILESIZE + half,
			y * TILESIZE,
			autotile.TR[tr].x, autotile.TR[tr].y, autotile.TR[tr].w, autotile.TR[tr].h
		)
		r.drawTexRect(
			tileset,
			x * TILESIZE,
			y * TILESIZE + half,
			autotile.BL[bl].x, autotile.BL[bl].y, autotile.BL[bl].w, autotile.BL[bl].h
		)
		r.drawTexRect(
			tileset,
			x * TILESIZE + half,
			y * TILESIZE + half,
			autotile.BR[br].x, autotile.BR[br].y, autotile.BR[br].w, autotile.BR[br].h
		)
	}

	clearColor(): Color {
		return [0.2, 0.2, 0.2, 1.0]
	}

}


export { Tilemap }
