import { black, Color } from "./colors"
import { Renderer } from "./renderer"

abstract class Scene {
	loaded: boolean = false;

	abstract init(r: Renderer): Promise<void>
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