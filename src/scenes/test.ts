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
		for (let i = 0; i < 100; i++) {
			const x = (i % 10) * 0.2 - 0.9;  // 10 columns, starting from -0.9
			const y = Math.floor(i / 10) * 0.2 - 0.9
			r.drawTriangle(
				x, y,           // bottom left
				x + 0.1, y,     // bottom right 
				x + 0.05, y + 0.1,  // top center
				0.1 + 0.8 * i / 100.0, 0, 0, 1.0 // color
			);
		}

		drawImage(r, this.myTexture, this.x);
	}
}

function drawImage(r: Renderer, tex: GLTexture, x: number = 0.0, y: number = 0.0): void {
	const width = tex.width;
	const height = tex.height;
	r.drawTriangleTextured(
		tex,
		x, y, 1, 1, 1, 1, 0.0, 1.0,  // Bottom left (flip v)
		x + width, y, 1, 1, 1, 1, 1.0, 1.0,   // Bottom right (flip v)
		x, y + height, 1, 1, 1, 1, 0.0, 0.0    // Top left (flip v)
	);
	r.drawTriangleTextured(
		tex,
		x + width, y, 1, 1, 1, 1, 1.0, 1.0,   // Bottom right (flip v)
		x + width, y + height, 1, 1, 1, 1, 1.0, 0.0,    // Top right (flip v)
		x, y + height, 1, 1, 1, 1, 0.0, 0.0    // Top left (flip v)
	);
}

export { TestScene }