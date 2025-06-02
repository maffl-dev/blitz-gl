import { Color, white } from "@/engine/colors";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "@/engine/config";
import { Input, Key } from "@/engine/input";
import { Texture, Renderer, RenderTarget, BlendMode, Shader } from "@/engine/renderer";
import { Scene } from "@/engine/scene";
import { Autotile, calcMinitiles, createAutotilesFromTexture, LayerType, TileID, TileLayer, TILESIZE, unpackMinitiles } from "@/engine/tiles";
import { assert, echo, loadString, panic } from "@/engine/utils";

class Tilemap extends Scene {
	time: number = 0.0;

	layers!: TileLayer[]
	tilesets!: Texture[]
	normals!: Texture[]
	autotiles!: Autotile[]

	lightRenderTarget!: RenderTarget
	lights!: Light[]
	lightShader!: Shader;
	normalsRenderTarget!: RenderTarget

	async init(r: Renderer): Promise<void> {
		echo("init tilemap");

		this.lightRenderTarget = r.createRenderTarget(SCREEN_WIDTH, SCREEN_HEIGHT)
		this.lightShader = r.createFragShader(loadString("shaders/light.fs"))
		this.normalsRenderTarget = r.createRenderTarget(SCREEN_WIDTH, SCREEN_HEIGHT)

		await this.initMap(r);
	}

	async initMap(r: Renderer): Promise<void> {
		const mapName = "mines";
		const mapInfo = loadString(`maps/${mapName}/map.json`);
		const json = JSON.parse(mapInfo);
		const info = json.info;
		const nrOfLayers = json.layers.length;
		const nrOfLights = json.lights.length;

		this.layers = new Array(nrOfLayers)
		this.tilesets = new Array(nrOfLayers)
		this.normals = new Array(nrOfLayers)

		// layers
		for (let i = 0; i < this.layers.length; i++) {
			const layer = json.layers[i];
			const type = LayerType[layer.type as keyof typeof LayerType]
			assert(type !== undefined, "Mapload Error! Layer type invalid: " + layer.type)
			this.layers[i] = new TileLayer(info.width, info.height, type)
			this.layers[i].decodeRLE(layer.data)

			this.tilesets[i] = await r.loadTex(`tilesets/${layer.tileset}.png`)
			if (type === LayerType.Autotiles) {
				// TODO: multiple autotiles
				this.autotiles = createAutotilesFromTexture(this.tilesets[i]);
			}
			this.normals[i] = await r.loadTex(`tilesets/${layer.tileset}_normal.png`)
		}

		// lights
		this.lights = new Array(nrOfLights)
		for (let i = 0; i < this.lights.length; i++) {
			this.lights[i] = json.lights[i]
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
			if (layer.type === LayerType.Autotiles) {
				this.drawAutotiles(r, layer, this.tilesets[i]);
			} else {
				this.drawLayer(r, layer, this.tilesets[i]);
			}
		}

		// normal map
		r.setRenderTarget(this.normalsRenderTarget)
		r.clearRenderTarget([0.5, 0.5, 1.0, 1.0])
		r.setBlendmode(BlendMode.Alpha)
		r.setShader()
		r.setColor(...white)
		for (let i = 0; i < this.layers.length; i++) {
			const layer = this.layers[i]
			if (i === 0) {
				this.drawAutotiles(r, layer, this.normals[i])
			} else {
				this.drawLayer(r, layer, this.normals[i])
			}
		}

		// lightmap
		const ambient = 0.3;
		r.setRenderTarget(this.lightRenderTarget)
		r.clearRenderTarget([ambient, ambient, ambient, 1.0])
		r.setBlendmode(BlendMode.Additive)
		r.setShader(this.lightShader)
		this.lightShader.setUniform("Resolution", [SCREEN_WIDTH, SCREEN_HEIGHT])
		this.lightShader.setUniform("NormalTexture", this.normalsRenderTarget.texture, 1)
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
