import { Renderer } from "../engine/renderer"

export abstract class System {
	abstract update(dt: number): void
	render(r: Renderer): void { }
}

export class SystemManager {
	private systems: System[] = []
	private lateSystems: System[] = []

	add(sys: System, isLateSystem: boolean = true) {
		if (isLateSystem) {
			this.lateSystems.push(sys)
		} else {
			this.systems.push(sys)
		}
	}

	update(dt: number) {
		for (const sys of this.systems) sys.update(dt)
	}

	lateUpdate(dt: number) {
		for (const sys of this.lateSystems) sys.update(dt)
	}

	render(r: Renderer) {
		for (const sys of this.systems) sys.render(r)
		for (const sys of this.lateSystems) sys.render(r)
	}
}