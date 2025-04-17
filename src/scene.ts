import { Renderer } from "./renderer"

abstract class Scene {
	abstract init(): void
	abstract update(dt: number): void
	abstract render(r: Renderer): void

	onExit(nextScene: Scene): void { }
	canPause(): boolean {
		return false
	}

}

export { Scene }