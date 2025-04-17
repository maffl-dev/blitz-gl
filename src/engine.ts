import { Renderer } from "./renderer"
import { Scene } from "./scene"

export class Engine {
	lastTime: number = 0
	activeScene!: Scene | null
	renderer: Renderer

	constructor(ren: Renderer) {
		this.renderer = ren
		requestAnimationFrame(this.loop)
	}

	loop = (time: number) => {
		const dt: number = time - this.lastTime
		this.lastTime = time

		this.update(dt)
		this.render()

		requestAnimationFrame(this.loop)
	}

	update(dt: number) {
		assert(this.activeScene, "Engine.update: no active scene!")
		this.activeScene.update(dt)
	}

	render() {
		this.renderer.beginFrame()
		assert(this.activeScene, "Engine.render: no active scene!")
		this.activeScene.render(this.renderer)
		this.renderer.flush()
	}

	changeScene(newScene: Scene) {
		if (this.activeScene) {
			this.activeScene.onExit(newScene)
		}
		this.activeScene = newScene
		newScene.init(this.renderer)
	}
}

function assert(condition: any, message: string = "Assertion failed"): asserts condition {
	if (!condition) {
		throw new Error(message)
	}
}