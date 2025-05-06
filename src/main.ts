import { Engine } from "./engine/engine"
import { WebGLRenderer } from "./engine/renderer"
import { DebugStats } from "./engine/systems/debug_stats"
import { TestScene } from "./game/scenes/test"

const TILESIZE: number = 20
const SCREEN_WIDTH: number = 340
const SCREEN_HEIGHT: number = 220

const canvas: HTMLCanvasElement = document.createElement("canvas") as HTMLCanvasElement
canvas.width = SCREEN_WIDTH
canvas.height = SCREEN_HEIGHT
const gameDiv: HTMLCanvasElement = document.querySelector("#game") as HTMLCanvasElement
gameDiv.appendChild(canvas)

const renderer = new WebGLRenderer(canvas)
const engine = new Engine(renderer)
// engine.systems.add(new DebugStats)
engine.changeScene(new TestScene)
