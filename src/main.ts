import { Audio } from "./engine/audio"
import { Engine } from "./engine/engine"
import { Input } from "./engine/input"
import { WebGLRenderer } from "./engine/renderer"
import { DebugStats } from "./engine/systems/debug_stats"
import { TestScene } from "./game/scenes/test"

const TILESIZE: number = 20
const SCREEN_WIDTH: number = 340
const SCREEN_HEIGHT: number = 220

// start!
main();

function main(): void {
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
	engine.changeScene(new TestScene)
}
