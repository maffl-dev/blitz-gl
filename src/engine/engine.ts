import { assert } from "./utils"
import { Renderer } from "./renderer"
import { Scene } from "./scene"
import { SystemManager } from "./systems"

export class Engine {
	lastTime: number = 0
	activeScene!: Scene | null
	renderer: Renderer
	systems: SystemManager

	constructor(ren: Renderer) {
		this.renderer = ren
		this.systems = new SystemManager;
		this.lastTime = performance.now();
		requestAnimationFrame(this.loop)
	}

	loop = (time: number) => {
		const dt: number = Math.min(time - this.lastTime, 0.1)
		this.lastTime = time

		this.update(dt)
		this.render()

		requestAnimationFrame(this.loop)
	}

	update(dt: number) {
		assert(this.activeScene, "Engine.update: no active scene!")
		this.systems.update(dt);
		this.activeScene.update(dt)
		this.systems.lateUpdate(dt);
	}

	render() {
		assert(this.activeScene, "Engine.render: no active scene!")
		this.renderer.beginFrame(this.activeScene.clearColor())
		this.activeScene.render(this.renderer)
		this.systems.render(this.renderer);
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
