import { Color, white } from "@/engine/colors";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "@/engine/config";
import { Input, Key } from "@/engine/input";
import { Texture, Renderer, RenderTarget, BlendMode, Shader } from "@/engine/renderer";
import { Scene } from "@/engine/scene";
import { Autotile, calcMinitiles, createAutotilesFromTexture, TileID, TileLayer, TILESIZE, unpackMinitiles } from "@/engine/tiles";
import { echo, loadString, panic } from "@/engine/utils";

class Tilemap extends Scene {
	time: number = 0.0;

	layers!: TileLayer[]
	autotiles!: Autotile[]
	texAutotiles!: Texture
	normalAutotiles!: Texture
	texTiles!: Texture
	normalTexture!: Texture;

	lightRenderTarget!: RenderTarget
	lights!: Light[]
	lightShader!: Shader;
	normalRenderTarget!: RenderTarget

	async init(r: Renderer): Promise<void> {
		echo("init tilemap");

		// lights
		this.lightRenderTarget = r.createRenderTarget(SCREEN_WIDTH, SCREEN_HEIGHT)
		this.lights = new Array(20)
		for (let i = 0; i < this.lights.length; i++) {
			this.lights[i] = {
				x: 0,
				y: 0,
				radius: 0,
				color: white,
			}
		}
		this.lightShader = r.createFragShader(loadString("shaders/light.fs"))

		// map
		this.texAutotiles = await r.loadTex("tilesets/autotiles.png")
		this.normalAutotiles = await r.loadTex("tilesets/autotiles_normal.png");
		this.texTiles = await r.loadTex("tilesets/cave.png")
		this.normalTexture = await r.loadTex("tilesets/cave_normal.png")
		this.normalRenderTarget = r.createRenderTarget(SCREEN_WIDTH, SCREEN_HEIGHT)

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

		// lights
		this.lights[0] = {
			x: 170,
			y: 30,
			color: [1, 1, 1, 1.0],
			radius: 60
		}
		this.lights[1] = {
			x: 50,
			y: 50,
			color: [1, 1, 1, 1.0],
			radius: 70
		}
		this.lights[2] = {
			x: 184,
			y: 140,
			color: [1, 1, 1, 0.3],
			radius: 100
		}
	}

	update(dt: number): void {
		this.time += dt;

		if (Input.keyDown(Key.W)) {
			this.lights[0].y -= 100 * dt;
		} else if (Input.keyDown(Key.S)) {
			this.lights[0].y += 100 * dt;
		}
		if (Input.keyDown(Key.A)) {
			this.lights[0].x -= 100 * dt;
		} else if (Input.keyDown(Key.D)) {
			this.lights[0].x += 100 * dt;
		}

		if (Input.keyDown(Key.Up)) {
			this.lights[0].radius += 40 * dt;
		} else if (Input.keyDown(Key.Down)) {
			this.lights[0].radius -= 40 * dt;
		}
	}

	render(r: Renderer): void {
		// map
		r.setRenderTarget()
		r.setBlendmode(BlendMode.Alpha)
		r.setShader()
		r.setColor(...white)
		for (let i = 0; i < this.layers.length; i++) {
			const layer = this.layers[i];
			if (i === 0) {
				this.drawAutotiles(r, layer, this.texAutotiles);
			} else {
				this.drawLayer(r, layer, this.texTiles);
			}
		}

		// normal map
		r.setRenderTarget(this.normalRenderTarget)
		r.clearRenderTarget([0.5, 0.5, 1.0, 1.0])
		r.setBlendmode(BlendMode.Alpha)
		r.setShader()
		r.setColor(...white)
		for (let i = 0; i < this.layers.length; i++) {
			const layer = this.layers[i]
			if (i === 0) {
				this.drawAutotiles(r, layer, this.normalAutotiles)
			} else {
				this.drawLayer(r, layer, this.normalTexture)
			}
		}

		// lightmap
		const ambient = 0.3;
		r.setRenderTarget(this.lightRenderTarget)
		r.clearRenderTarget([ambient, ambient, ambient, 1.0])
		r.setBlendmode(BlendMode.Additive)
		r.setShader(this.lightShader)
		this.lightShader.setUniform("Resolution", [SCREEN_WIDTH, SCREEN_HEIGHT])
		this.lightShader.setUniform("NormalTexture", this.normalRenderTarget.texture, 1)
		for (const light of this.lights) {
			const color = light.color;
			if (light.radius > 0.0) {
				this.lightShader.setUniform("LightPos", [light.x, light.y])
				this.lightShader.setUniform("Radius", light.radius)
				r.setColor(color[0] * color[3], color[1] * color[3], color[2] * color[3], 1);
				r.drawRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)
				r.flush();
			}
		}
		r.setRenderTarget()
		r.setBlendmode(BlendMode.Multiply)
		r.setShader()
		r.setColor(...white)
		r.drawRenderTarget(this.lightRenderTarget, 0, 0)
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


interface Light {
	x: number;
	y: number;
	radius: number;
	color: Color;
}


export { Tilemap }
