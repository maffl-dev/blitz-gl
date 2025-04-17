import { Engine } from "./engine"
import { WebGLRenderer } from "./renderer"
import { TestScene } from "./scenes/test"

const TILESIZE: number = 20
const SCREEN_WIDTH: number = TILESIZE * 17
const SCREEN_HEIGHT: number = TILESIZE * 11

const canvas: HTMLCanvasElement = document.createElement("canvas") as HTMLCanvasElement
canvas.width = SCREEN_WIDTH
canvas.height = SCREEN_HEIGHT
const gameDiv: HTMLCanvasElement = document.querySelector("#game") as HTMLCanvasElement
gameDiv.appendChild(canvas)

const renderer = new WebGLRenderer(canvas)
const engine = new Engine(renderer)
engine.changeScene(new TestScene)
