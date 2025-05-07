import { red } from "../colors";
import { Renderer } from "../renderer";
import { System } from "../systems";
import { echo } from "../utils";

export class DebugStats extends System {

	update(dt: number): void {

	}

	render(r: Renderer): void {
		const m = r.getMetrics();
		echo(m);
		r.setColor(...red)
		r.drawRect(4, 4, 8, 8)
	}

}