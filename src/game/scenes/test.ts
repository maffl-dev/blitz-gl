import { testSound } from "@/engine/audio";
import { Color, semiGreen, white } from "@/engine/colors";
import { Input, Key, Mouse } from "@/engine/input";
import { BlendMode, Texture, Renderer, Shader } from "@/engine/renderer";
import { Scene } from "@/engine/scene";
import { echo, loadString } from "@/engine/utils";

class TestScene extends Scene {
	x: number = 0.0
	time: number = 0.0;
	private myTexture!: Texture;
	private bwShader!: Shader;
	private glitchShader!: Shader;

	init(r: Renderer): void {
		echo("init test scene");
		this.myTexture = r.loadTex("/common/test.png")

		const bw = loadString("/shaders/bw.fs");
		this.bwShader = r.createFragShader(bw)
		this.bwShader.setUniform("Level", 1.0);

		this.glitchShader = r.createFragShader(loadString("/shaders/glitch.fs"));
		this.glitchShader.setUniform("Time", this.time);
		this.glitchShader.setUniform("Strength", 0.4);
		this.glitchShader.setUniform("Amount", 1.0);
	}

	update(dt: number): void {
		this.x = Math.sin(performance.now() * 0.0005) * 0.5
		this.time += dt;

		//this.testInput();
		this.testAudio();
	}

	testInput(): void {
		if (Input.mouseDown(Mouse.Middle)) {
			echo("middle mouse down");
		}
		if (Input.mouseHit(Mouse.Right)) {
			echo("right mouse hit");
		}
		if (Input.mouseUp()) {
			echo("left mouse up");
		}

		if (Input.keyHit(Key.A)) {
			echo("Hit A!")
		}
		if (Input.keyDown(Key.A)) {
			echo("Down A!")
		}
		if (Input.keyUp(Key.A)) {
			echo("released A!")
		}

		if (Math.abs(Input.mouseWheelY()) >= 0.5) {
			echo(Input.mouseWheelY())
		}
	}

	testAudio(): void {
		if (Input.keyHit(Key.Space)) {
			testSound();
		}
	}


	render(r: Renderer): void {
		// this.drawBasic(r)
		this.drawShapes(r)
		// this.drawTextures(r)
		// this.drawTranslated(r)
	}

	clearColor(): Color {
		return [0.5, 0.5, 0.5, 1.0]
	}

	drawBasic(r: Renderer): void {
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
	}

	drawShapes(r: Renderer): void {
		r.setBlendmode(BlendMode.Alpha)
		r.setColor(1.0, 1.0, 1.0)
		r.setAlpha(0.6)
		r.drawPoint(10, 30)
		r.drawTri(20, 10, 30, 30, 40, 10)

		r.setColor(0.3, 0.3, 0.3, 0.5)
		r.drawRect(60, 20, 100, 30)

		r.setColor(1.0, 0.0, 0.0, 0.5)
		r.drawCircle(50, 90, 25)
	}

	drawTextures(r: Renderer): void {
		r.setAlpha(1)
		r.setColor(1.0, 1, 1, 0.4)
		r.drawTex(this.myTexture, 52, 52)

		r.setColor(...semiGreen)
		r.setBlendmode(BlendMode.Additive)
		r.drawTex(this.myTexture, 182, 52)

		r.setBlendmode(BlendMode.Alpha)
		r.setColor(...white)
		r.setShader(this.bwShader)
		r.drawTexRect(this.myTexture, 10, 10, 0, 0, 100, 200)

		if (Input.mouseDown()) {
			r.setShader(this.glitchShader);
			this.glitchShader.setUniform("Time", this.time);
		} else {
			r.setShader(); // reset shader
		}
		r.setColor(...white)
		r.drawTex(this.myTexture, 10, 70)
	}

	drawTranslated(r: Renderer): void {
		r.setColor(...semiGreen)
		r.push()
		{
			r.translate(50, 50)
			r.scale(1.5, 1.5)
			r.translate(50, 25)
			r.rotate(Math.PI / 2)
			r.translate(-50, -25)
			r.drawRect(0, 0, 100, 50)
		}
		r.pop()
		r.push()
		{
			r.setColor(...white)
			r.translate(10, 10)
			r.drawRect(0, 0, 10, 10)
		}
		r.pop()
	}

}


export { TestScene }