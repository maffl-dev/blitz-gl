import { Audio } from "./engine/audio"
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./engine/config"
import { Engine } from "./engine/engine"
import { Input } from "./engine/input"
import { WebGLRenderer } from "./engine/renderer"
import { DebugStats } from "./engine/systems/debug_stats"
import { TestScene } from "./game/scenes/test"
import { Tilemap } from "./game/scenes/tilemap"

// start!
main();

function main() {
	const canvas: HTMLCanvasElement = document.createElement("canvas") as HTMLCanvasElement
	canvas.width = SCREEN_WIDTH
	canvas.height = SCREEN_HEIGHT
	const gameDiv: HTMLCanvasElement = document.querySelector("#game") as HTMLCanvasElement
	gameDiv.appendChild(canvas)

	Input.init(canvas)
	Audio.init()

	const renderer = new WebGLRenderer(canvas)
	const engine = new Engine(renderer)
	// engine.systems.add(new DebugStats)
	engine.changeScene(new Tilemap)
}
