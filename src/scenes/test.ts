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
			const x = (i % 10) * 34;  // 10 columns of 34px each
			const y = Math.floor(i / 10) * 22;  // 22px height per row
			r.drawTriangle(
				x, y + 22,             // Bottom left (remember: +Y is downward)
				x + 34, y + 22,        // Bottom right
				x + 17, y,             // Top center
				0.1 + 0.8 * i / 100.0, 0.0, 0.2, 1.0  // color
			)
		}
		drawImage(r, this.myTexture, this.x * 100.0, 0);
	}
}

function drawImage(r: Renderer, tex: GLTexture, x: number = 0.0, y: number = 0.0): void {
	const width = tex.width;
	const height = tex.height;
	r.drawTriangleTextured(
		tex,
		x, y, 1, 1, 1, 1, 0.0, 1.0,  // Bottom left (flipped v)
		x + width, y, 1, 1, 1, 1, 1.0, 1.0,   // Bottom right
		x, y + height, 1, 1, 1, 1, 0.0, 0.0    // Top left
	);
	r.drawTriangleTextured(
		tex,
		x + width, y, 1, 1, 1, 1, 1.0, 1.0,   // Bottom right
		x + width, y + height, 1, 1, 1, 1, 1.0, 0.0,    // Top right
		x, y + height, 1, 1, 1, 1, 0.0, 0.0    // Top left
	);
}

export { TestScene }