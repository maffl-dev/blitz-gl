import { semiGreen, white } from "@/engine/colors";
import { GLTexture, Renderer } from "@/engine/renderer";
import { Scene } from "@/engine/scene";

class TestScene extends Scene {
	x: number = 0.0
	private myTexture!: GLTexture;

	init(r: Renderer): void {
		console.log("init test scene");
		this.myTexture = r.loadTex("/common/test.png")
	}

	update(dt: number): void {
		this.x = Math.sin(performance.now() * 0.0005) * 0.5
	}

	render(r: Renderer): void {
		// low level: triangles and quads
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
			10, 100, 1.0, 0.0, 0.0, 1.0,
		)
		r.drawQuadTextured(
			this.myTexture,
			200, 10, ...white, 0, 1,    // Top left
			300, 10, ...white, 1, 1,    // Top right  
			300, 100, ...white, 1, 0,   // Bottom right
			200, 100, ...white, 0, 0,   // Bottom left
		)

		// textures & colors
		r.setAlpha(0.7)
		r.setColor(1.0, 0.2, 0.2)
		r.drawTex(this.myTexture, 52, 52)
		r.setColor(...semiGreen)
		r.drawTex(this.myTexture, 182, 52)
	}
}

export { TestScene }