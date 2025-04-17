import { Renderer } from "../renderer";
import { Scene } from "../scene";

class TestScene extends Scene {
	x: number = 0.0

	init(): void {
		console.log("init test scene");
	}

	update(dt: number): void {
		this.x = Math.sin(performance.now() * 0.0005) * 0.5
	}

	render(r: Renderer): void {
		for (let i = 0; i < 100; i++) {
			const x = (i % 10) * 0.2 - 0.9 + this.x;  // 10 columns, starting from -0.9
			const y = Math.floor(i / 10) * 0.2 - 0.9
			r.drawTriangle(
				x, y,           // bottom left
				x + 0.1, y,     // bottom right 
				x + 0.05, y + 0.1,  // top center
				0.1 + 0.8 * i / 100.0, 0, 0, 1.0 // color
			);
		}
	}
}

export { TestScene }