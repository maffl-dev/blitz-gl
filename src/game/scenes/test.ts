import { Audio } from "@/engine/audio";
import { Color, semiGreen, white } from "@/engine/colors";
import { Input, Key, Mouse } from "@/engine/input";
import { BlendMode, Texture, Renderer, Shader, RenderTarget } from "@/engine/renderer";
import { Scene } from "@/engine/scene";
import { echo, loadString, profile } from "@/engine/utils";

class TestScene extends Scene {
	x: number = 0.0
	time: number = 0.0;
	private myTexture!: Texture;
	private bwShader!: Shader;
	private glitchShader!: Shader;

	async init(r: Renderer): Promise<void> {
		echo("init test scene");
		this.myTexture = await r.loadTex("/common/test.png")

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

	// audio funcs
	testAudio(): void {
		// this.testSoundSimple();
		// this.testSoundPanning();
		this.testSoundFading();
		// this.testMusicSound();
		// this.testMusicStream();
	}

	testSoundSimple(): void {
		if (Input.keyHit(Key.Space)) {
			Audio.setVolume(1)
			const ms = performance.now();
			Audio.loadSound("/sounds/cast_hero.wav").then((sound) => {
				echo(performance.now() - ms)
				Audio.playSound(sound, { rate: 1.2, volume: 1.0, channel: 30 })

				setTimeout(() => {
					// Audio.setChannelVolume(30, 0.1)
				}, 150);
			})
		}
	}

	testSoundPanning(): void {
		const channel = 1;

		if (Input.keyHit(Key.Space)) {
			Audio.loadSound("/sounds/cast_hero.wav").then((sound) => {
				profile(() => {
					Audio.playSound(sound, { loop: true, channel: channel });
				})
			})
		}

		if (Input.mouseHit(Mouse.Left)) {
			echo("pan left")
			Audio.setChannelPan(channel, -1);
		} else if (Input.mouseHit(Mouse.Right)) {
			echo("pan right")
			Audio.setChannelPan(channel, 1);
		}
	}

	testSoundFading(): void {
		const channel = 1;

		if (Input.keyHit(Key.Space)) {
			echo(Audio.channelState(channel))
			Audio.loadSound("/sounds/cast_hero.wav").then((sound) => {
				profile(() => {
					Audio.playSound(sound, { loop: true, channel: channel });
				})
			})
		}

		if (Input.mouseHit(Mouse.Left)) {
			echo("fade out", Audio.channelState(channel))
			Audio.fadeChannelTo(channel, 0.0, 2.0);
		} else if (Input.mouseHit(Mouse.Right)) {
			echo("fade in", Audio.channelState(channel))
			Audio.fadeChannelTo(channel, 1.0, 2.0);
		}
	}

	testMusicSound() {
		const ms = Date.now();
		Audio.loadSound("/music/battle.ogg").then((sound) => {
			echo(Date.now() - ms)
			Audio.playSound(sound)
		})
	}

	testMusicStream() {
		if (Input.keyHit(Key.Space)) {
			const ms = performance.now();
			Audio.playMusic("/music/battle.ogg", true).then(() => {
				echo(performance.now() - ms)
			})
			// Audio.musicPlayer.fadeTo(1.0, 2.0);
		} else if (Input.keyHit(Key.Digit1)) {
			// Audio.pauseMusic()
			echo(Audio.isMusicPlaying())
			Audio.fadeMusic(0.0, 1.0);
		} else if (Input.keyHit(Key.Digit2)) {
			// Audio.resumeMusic()
			Audio.fadeMusic(1.0, 1.0)
			echo(Audio.isMusicPlaying())
		}
	}


	// rendering
	render(r: Renderer): void {
		// this.drawBasic(r)
		// this.drawShapes(r)
		// this.drawTextures(r)
		// this.drawTranslated(r)
		this.drawToTexture(r);
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
		r.drawRect(10, 20, 100, 30)

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

	// returned color will be the background color
	clearColor(): Color {
		return [0.5, 0.5, 0.5, 1.0]
	}

	private rt!: RenderTarget
	drawToTexture(r: Renderer): void {
		// Allocate a render target texture (once, ideally cache it)
		if (!this.rt) {
			this.rt = r.createRenderTarget(150, 150);
		}

		// Bind the target for offscreen rendering
		r.setRenderTarget(this.rt);
		r.clearRenderTarget()

		// Draw something into the texture
		r.setColor(1, 1, 0, 1);
		r.drawCircle(64, 64, 64);
		r.setColor(1, 0, 0, 1.0);
		r.drawRect(10, 0, 10, 10);

		// Back to screen
		r.setRenderTarget();

		// Draw the result texture on screen
		r.setColor(1, 1, 1, 1);
		r.push()
		r.translate(10, 50)
		r.setShader(this.bwShader)
		r.drawRenderTarget(this.rt, this.time * 30.0, 0);
		r.pop()

		r.setShader()
		r.setColor(0, 0, 1);
		r.drawRect(0, 10, 10, 10);
	}


}


export { TestScene }