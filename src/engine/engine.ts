import { assert } from "./utils"
import { Renderer } from "./renderer"
import { Scene } from "./scene"
import { SystemManager } from "./systems"
import { Input } from "./input"
import { clamp } from "./math"

export class Engine {
	lastTime: number = 0
	activeScene!: Scene | null
	renderer: Renderer
	systems: SystemManager

	constructor(ren: Renderer) {
		this.renderer = ren
		this.systems = new SystemManager
		this.lastTime = performance.now()
		requestAnimationFrame(this.loop)
	}

	loop = (time: number) => {
		let dt: number = (time - this.lastTime) / 1000.0;
		dt = clamp(dt, 0.001, 0.1);
		this.lastTime = time

		this.update(dt)
		this.render()

		requestAnimationFrame(this.loop)
	}

	update(dt: number) {
		assert(this.activeScene, "Engine.update: no active scene!")
		this.systems.update(dt);
		if (this.activeScene.loaded) {
			this.activeScene.update(dt)
		}
		this.systems.lateUpdate(dt);
		Input.update();
	}

	render() {
		assert(this.activeScene, "Engine.render: no active scene!")
		this.renderer.beginFrame(this.activeScene.clearColor())
		if (this.activeScene.loaded) {
			this.activeScene.render(this.renderer)
		}
		this.systems.render(this.renderer);
		this.renderer.endFrame()
	}

	async changeScene(newScene: Scene) {
		if (this.activeScene) {
			this.activeScene.onExit(newScene)
		}
		this.activeScene = newScene
		await newScene.init(this.renderer)
		newScene.loaded = true;
	}
}
