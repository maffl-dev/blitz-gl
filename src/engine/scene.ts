import { black, Color } from "./colors"
import { Renderer } from "./renderer"

abstract class Scene {
	abstract init(r: Renderer): void
	abstract update(dt: number): void
	abstract render(r: Renderer): void

	onExit(nextScene: Scene): void { }
	canPause(): boolean {
		return false
	}
	clearColor(): Color {
		return black;
	}

}

export { Scene }