import { assert } from "./utils"
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
		assert(this.activeScene, "Engine.render: no active scene!")
		this.renderer.beginFrame(this.activeScene.clearColor())
		this.activeScene.render(this.renderer)
		this.renderer.endFrame()
	}

	changeScene(newScene: Scene) {
		if (this.activeScene) {
			this.activeScene.onExit(newScene)
		}
		this.activeScene = newScene
		newScene.init(this.renderer)
	}
}
