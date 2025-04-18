import { GLTexture, Renderer } from "../renderer";
import { Scene } from "../scene";

class TestScene extends Scene {
	x: number = 0.0
	private myTexture!: GLTexture;

	init(r: Renderer): void {
		console.log("init test scene");
		this.myTexture = r.loadTexture("/common/test.png")
	}

	update(dt: number): void {
		this.x = Math.sin(performance.now() * 0.0005) * 0.5
	}

	render(r: Renderer): void {
		const white = [1, 1, 1, 1] as const;

		for (let i = 0; i < 100; i++) {
			const x = (i % 10) * 34;  // 10 columns of 34px each
			const y = Math.floor(i / 10) * 22;  // 22px height per row
			const color = [0.1 + 0.8 * i / 100.0, 0.0, 0.2, 1.0] as const;
			r.drawTriangle(
				x, y + 22, ...color,             // Bottom left (remember: +Y is downward)
				x + 34, y + 22, ...color,       // Bottom right
				x + 17, y, ...color,             // Top center
			)
		}

		r.drawQuad(
			10, 10, ...white,
			100, 10, ...white,
			100, 100, ...white,
			10, 100, ...white,
		)

		r.drawQuadTextured(
			this.myTexture,
			200, 10, ...white, 0, 1,    // Top left
			300, 10, ...white, 1, 1,    // Top right  
			300, 100, ...white, 1, 0,   // Bottom right
			200, 100, ...white, 0, 0,   // Bottom left
		)

		r.drawTexture(this.myTexture, 52, 52)
	}
}

export { TestScene }