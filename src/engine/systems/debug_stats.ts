import { red } from "../colors";
import { Renderer } from "../renderer";
import { System } from "../systems";

export class DebugStats extends System {

	update(dt: number): void {

	}

	render(r: Renderer): void {
		const m = r.getMetrics();
		console.log(m);
		r.setColor(...red)
		r.drawRect(4, 4, 8, 8)
	}

}