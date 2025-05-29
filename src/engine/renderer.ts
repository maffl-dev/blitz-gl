import { Color, white } from "./colors";
import { assert, clamp, echo, loadString, panic } from "./utils";

export interface Renderer {
	// low level basics
	beginFrame(clearColor: Color): void
	flush(): void
	endFrame(): void

	// low level drawing funcs
	drawTriangle(
		x1: number, y1: number, r1: number, g1: number, b1: number, a1: number,
		x2: number, y2: number, r2: number, g2: number, b2: number, a2: number,
		x3: number, y3: number, r3: number, g3: number, b3: number, a3: number
	): void
	drawTriangleTextured(
		tex: Texture,
		x1: number, y1: number, r1: number, g1: number, b1: number, a1: number, u1: number, v1: number,
		x2: number, y2: number, r2: number, g2: number, b2: number, a2: number, u2: number, v2: number,
		x3: number, y3: number, r3: number, g3: number, b3: number, a3: number, u3: number, v3: number
	): void
	drawQuad(
		x1: number, y1: number, r1: number, g1: number, b1: number, a1: number,
		x2: number, y2: number, r2: number, g2: number, b2: number, a2: number,
		x3: number, y3: number, r3: number, g3: number, b3: number, a3: number,
		x4: number, y4: number, r4: number, g4: number, b4: number, a4: number
	): void
	drawQuadTextured(
		tex: Texture,
		x1: number, y1: number, r1: number, g1: number, b1: number, a1: number, u1: number, v1: number,
		x2: number, y2: number, r2: number, g2: number, b2: number, a2: number, u2: number, v2: number,
		x3: number, y3: number, r3: number, g3: number, b3: number, a3: number, u3: number, v3: number,
		x4: number, y4: number, r4: number, g4: number, b4: number, a4: number, u4: number, v4: number
	): void

	// color
	setBlendmode(mode: BlendMode): void
	setColor(r: number, g: number, b: number, a?: number): void
	setAlpha(a: number): void;

	// shapes
	drawPoint(x: number, y: number): void
	drawTri(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void
	drawCircle(x: number, y: number, radius: number, segments?: number): void
	drawRect(x: number, y: number, w: number, h: number): void

	// textures
	loadTex(url: string): Promise<Texture>
	drawTex(tex: Texture, x: number, y: number): void
	drawTexRect(tex: Texture, x: number, y: number, sourceX: number, sourceY: number, sourceWidth: number, sourceHeight: number): void

	// transform
	translate(x: number, y: number): void
	rotate(angle: number): void
	scale(sx: number, sy: number): void
	applyTransform(ix: number, iy: number, jx: number, jy: number, tx: number, ty: number): void
	push(): void
	pop(): void
	origin(): void

	// shaders
	setShader(shader?: Shader): void;
	createVertexShader(vs: string): Shader;
	createFragShader(fs: string): Shader;
	createShader(vs: string, fs: string): Shader;

	// render targets
	createRenderTarget(width: number, height: number): RenderTarget
	setRenderTarget(rt?: RenderTarget): void
	drawRenderTarget(rt: RenderTarget, x: number, y: number): void
	clearRenderTarget(color?: Color): void
	destroyRenderTarget(rt: RenderTarget): void

	// other
	getMetrics(): Readonly<RenderMetrics>

}

export enum BlendMode {
	Opaque,
	Alpha,
	Additive,
	Multiply,
}

export class Texture {
	gl: WebGL2RenderingContext
	data: WebGLTexture
	width: number = 0
	height: number = 0

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl
		this.data = gl.createTexture()
		if (!this.data) {
			panic("Failed to create Texture");
		}
	}

	static createWhiteFallback(gl: WebGL2RenderingContext): Texture {
		const texture = new Texture(gl);
		texture.width = 1;
		texture.height = 1;

		gl.bindTexture(gl.TEXTURE_2D, texture.data);

		const white = new Uint8Array([255, 255, 255, 255]);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			1, 1,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			white
		);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		return texture;
	}

	bind(unit: number = 0): void {
		this.gl.activeTexture(this.gl.TEXTURE0 + unit);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.data);
	}
}

export interface RenderTarget {
	texture: Texture;
	framebuffer: WebGLFramebuffer;
	width: number;
	height: number;
}

export class Shader {
	private gl: WebGL2RenderingContext
	program: WebGLProgram
	private static currentProgram: WebGLProgram | null = null;
	private uniformLocations: Map<string, WebGLUniformLocation> = new Map();

	constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
		this.gl = gl;
		this.program = program;
	}

	use(): void {
		if (Shader.currentProgram !== this.program) {
			this.gl.useProgram(this.program)
			this.setupAttributes();
			Shader.currentProgram = this.program;
		}
	}

	private setupAttributes(): void {
		const gl = this.gl
		const vertexSize = 8; // TODO: should use renderer VERTEX_SIZE
		const stride = vertexSize * Float32Array.BYTES_PER_ELEMENT;

		// Position attribute
		const positionLoc = this.getAttribLocation("position");
		gl.enableVertexAttribArray(positionLoc);
		gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);

		// Color attribute
		const colorLoc = this.getAttribLocation("color");
		gl.enableVertexAttribArray(colorLoc);
		gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

		// UV attribute
		const uvLoc = this.getAttribLocation("uv");
		gl.enableVertexAttribArray(uvLoc);
		gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
	}

	setUniform(name: string, value: number | number[] | Texture): void {
		this.use();

		const location = this.getUniformLocation(name);
		if (location === null) return;

		if (typeof value === "number") {
			this.gl.uniform1f(location, value);
		}
		else if (Array.isArray(value)) {
			switch (value.length) {
				case 2: this.gl.uniform2fv(location, value); break;
				case 3: this.gl.uniform3fv(location, value); break;
				case 4: this.gl.uniform4fv(location, value); break;
				case 9: this.gl.uniformMatrix3fv(location, false, value); break;
				case 16: this.gl.uniformMatrix4fv(location, false, value); break;
				default: panic(`setUnfiorm ${name}. Unsupported uniform array length: ${value.length}`);
			}
		}

		else if (value instanceof Texture) {
			const unit = 0;
			value.bind(unit);
			this.gl.uniform1i(location, unit); // texture unit
		}
	}

	delete(): void {
		this.gl.deleteProgram(this.program);
	}

	getAttribLocation(name: string): number {
		const loc = this.gl.getAttribLocation(this.program, name);
		if (loc === -1) panic(`Attribute ${name} not found`);
		return loc;
	}

	getUniformLocation(name: string): WebGLUniformLocation | null {
		if (this.uniformLocations.has(name)) {
			return this.uniformLocations.get(name)!;
		}
		const loc = this.gl.getUniformLocation(this.program, name);
		if (loc !== null) this.uniformLocations.set(name, loc);
		return loc;
	}
}

export interface RenderMetrics {
	cpuFrameTime: number
	gpuFrameTime: number
	drawCalls: number
	triangleCount: number
}

export interface RenderTransform {
	ix: number, iy: number,
	jx: number, jy: number
	tx: number, ty: number
}

export class WebGLRenderer implements Renderer {
	private canvas: HTMLCanvasElement;
	private viewportWidth!: number;
	private viewportHeight!: number;
	private gl: WebGL2RenderingContext;

	private readonly MAX_TRIANGLES = 8192;
	private readonly VERTEX_SIZE = 8; // 2 for position, 4 for color, 2 for uv
	private readonly MAX_TRANSFORM_STACK_DEPTH = 256;
	private readonly MAX_TEXTURE_SIZE = 4096;

	private vertexBuffer!: WebGLBuffer;
	private vertexData!: Float32Array;
	private vertexCount = 0;

	private defaultShader!: Shader;
	private defaultVsShader!: WebGLShader;
	private defaultFragShader!: WebGLShader;
	private fallbackTexture!: Texture;
	private whitePixel = new Uint8Array([255, 255, 255, 255]);
	private premultiplyCanvas: HTMLCanvasElement
	private premultiplyContext: CanvasRenderingContext2D

	// state
	private currentShader!: Shader;
	private currentTexture!: Texture;
	private currentColor: Color = [...white];
	private currentSetColor: number[] = [1.0, 1.0, 1.0];
	private currentBlendMode: BlendMode = BlendMode.Opaque;
	private currentTransform: RenderTransform = {
		ix: 1, iy: 0,
		jx: 0, jy: 1,
		tx: 0, ty: 0
	};
	private transformStack: Array<RenderTransform> = []
	private currentRenderTarget: RenderTarget | null = null;

	// metrics
	private metrics: RenderMetrics = {
		cpuFrameTime: 0,
		gpuFrameTime: 0,
		drawCalls: 0,
		triangleCount: 0
	}
	private startRenderTime: number = 0.0;
	private extTimerQuery: any;
	private gpuQuery: WebGLQuery | null = null;
	private lastGpuQuery: WebGLQuery | null = null;
	private gpuTimePending: boolean = false;

	constructor(canvas: HTMLCanvasElement) {
		const gl = canvas.getContext("webgl2", { antialias: false });
		if (!gl) panic("WebGL2 not supported");
		this.gl = gl;
		this.canvas = canvas;
		this.premultiplyCanvas = document.createElement('canvas');
		this.premultiplyCanvas.width = this.MAX_TEXTURE_SIZE;
		this.premultiplyCanvas.height = this.MAX_TEXTURE_SIZE;
		this.premultiplyContext = this.premultiplyCanvas.getContext('2d')!;
		this.initGL();
		this.setViewportSize(canvas.width, canvas.height);
	}

	private initGL() {
		const gl = this.gl;

		// Create and setup position buffer
		this.vertexData = new Float32Array(this.MAX_TRIANGLES * 3 * this.VERTEX_SIZE); // 2 for position, 4 for color, 2 for uv
		this.vertexBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);

		// default shader
		const vsSource = loadString('/shaders/default.vs');
		const fsSource = loadString('/shaders/default.fs');
		this.defaultVsShader = compileShader(gl, gl.VERTEX_SHADER, vsSource);
		this.defaultFragShader = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
		const program = createProgram(gl, this.defaultVsShader, this.defaultFragShader);
		this.defaultShader = new Shader(gl, program);
		this.currentShader = this.defaultShader;
		this.currentShader.use();
		this.fallbackTexture = Texture.createWhiteFallback(gl);

		this.extTimerQuery = gl.getExtension("EXT_disjoint_timer_query_webgl2");
		if (!this.extTimerQuery) {
			console.warn("gpuFrameTime will not be measured. Browser does not support EXT_disjoint_timer_query_webgl2")
		}
	}

	beginFrame(clearColor: Color): void {
		const gl = this.gl;
		const ext = this.extTimerQuery;

		// Start metric timers
		this.metrics.drawCalls = 0;
		this.metrics.triangleCount = 0;
		this.startRenderTime = performance.now();

		// Check if we can read results from previous query
		if (this.gpuTimePending && ext && this.lastGpuQuery) {
			if (gl.getQueryParameter(this.lastGpuQuery, gl.QUERY_RESULT_AVAILABLE)) {
				const gpuTime = gl.getQueryParameter(this.lastGpuQuery, gl.QUERY_RESULT);
				this.metrics.gpuFrameTime = gpuTime / 1000000.0; // Convert nanoseconds to milliseconds
				this.gpuTimePending = false;
				gl.deleteQuery(this.lastGpuQuery);
				this.lastGpuQuery = null;
			}
		}

		// Start new GPU timer query for this frame
		if (ext) {
			this.gpuQuery = gl.createQuery();
			gl.beginQuery(ext.TIME_ELAPSED_EXT, this.gpuQuery);
		}

		this.setRenderTarget();
		gl.clearColor(...clearColor);
		gl.clear(gl.COLOR_BUFFER_BIT);

		this.vertexCount = 0;
		this.setColor(...white);
		this.setBlendmode(BlendMode.Alpha);
		this.origin();
		this.transformStack.length = 0;
		this.setShader(this.defaultShader);
		this.currentTexture = this.fallbackTexture;
		this.currentTexture.bind();
	}

	flush(): void {
		const gl = this.gl;

		if (this.vertexCount === 0) return;

		this.currentTexture.bind();

		// Bind and update vertex data
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexData.subarray(0, this.vertexCount * this.VERTEX_SIZE));

		gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

		this.metrics.drawCalls++;
		this.metrics.triangleCount += this.vertexCount / 3;

		this.vertexCount = 0;
	}

	endFrame(): void {
		const gl = this.gl;
		const ext = this.extTimerQuery;

		this.flush();

		this.metrics.cpuFrameTime = performance.now() - this.startRenderTime;

		// End GPU query and set it as pending
		if (ext && this.gpuQuery) {
			gl.endQuery(ext.TIME_ELAPSED_EXT);
			this.lastGpuQuery = this.gpuQuery; // Store reference to current query for reading later
			this.gpuQuery = null;
			this.gpuTimePending = true;
		}

		// echo(this.metrics);
	}

	// low level draw funcs (unaffected by setColor())
	drawTriangle(
		x1: number, y1: number, r1: number, g1: number, b1: number, a1: number,
		x2: number, y2: number, r2: number, g2: number, b2: number, a2: number,
		x3: number, y3: number, r3: number, g3: number, b3: number, a3: number
	): void {
		const minX = Math.min(x1, x2, x3);
		const minY = Math.min(y1, y2, y3);
		const maxX = Math.max(x1, x2, x3);
		const maxY = Math.max(y1, y2, y3);
		const w = maxX - minX || 1.0;
		const h = maxY - minY || 1.0;

		const u1 = (x1 - minX) / w;
		const v1 = 1.0 - (y1 - minY) / h;
		const u2 = (x2 - minX) / w;
		const v2 = 1.0 - (y2 - minY) / h;
		const u3 = (x3 - minX) / w;
		const v3 = 1.0 - (y3 - minY) / h;

		this.drawTriangleTextured(
			this.fallbackTexture,
			x1, y1, r1, g1, b1, a1, u1, v1,
			x2, y2, r2, g2, b2, a2, u2, v2,
			x3, y3, r3, g3, b3, a3, u3, v3
		);
	}


	drawTriangleTextured(
		tex: Texture,
		x1: number, y1: number, r1: number, g1: number, b1: number, a1: number, u1: number, v1: number,
		x2: number, y2: number, r2: number, g2: number, b2: number, a2: number, u2: number, v2: number,
		x3: number, y3: number, r3: number, g3: number, b3: number, a3: number, u3: number, v3: number
	): void {
		if ((this.vertexCount + 3) * this.VERTEX_SIZE > this.vertexData.length) {
			this.flush();
		}
		if (this.currentTexture !== tex) {
			this.flush();
			this.currentTexture = tex;
			this.currentTexture.bind();
		}
		const t = this.currentTransform;
		const tx1 = x1 * t.ix + y1 * t.jx + t.tx;
		const ty1 = x1 * t.iy + y1 * t.jy + t.ty;
		const tx2 = x2 * t.ix + y2 * t.jx + t.tx;
		const ty2 = x2 * t.iy + y2 * t.jy + t.ty;
		const tx3 = x3 * t.ix + y3 * t.jx + t.tx;
		const ty3 = x3 * t.iy + y3 * t.jy + t.ty;
		const base = this.vertexCount * this.VERTEX_SIZE;
		this.vertexData.set([
			tx1, ty1, r1, g1, b1, a1, u1, 1.0 - v1,
			tx2, ty2, r2, g2, b2, a2, u2, 1.0 - v2,
			tx3, ty3, r3, g3, b3, a3, u3, 1.0 - v3
		], base);
		this.vertexCount += 3;
	}

	drawQuad(
		x1: number, y1: number, r1: number, g1: number, b1: number, a1: number,
		x2: number, y2: number, r2: number, g2: number, b2: number, a2: number,
		x3: number, y3: number, r3: number, g3: number, b3: number, a3: number,
		x4: number, y4: number, r4: number, g4: number, b4: number, a4: number
	): void {
		this.drawTriangle(
			x1, y1, r1, g1, b1, a1,
			x2, y2, r2, g2, b2, a2,
			x3, y3, r3, g3, b3, a3
		);
		this.drawTriangle(
			x1, y1, r1, g1, b1, a1,
			x3, y3, r3, g3, b3, a3,
			x4, y4, r4, g4, b4, a4
		);
	}

	drawQuadTextured(
		tex: Texture,
		x1: number, y1: number, r1: number, g1: number, b1: number, a1: number, u1: number, v1: number,
		x2: number, y2: number, r2: number, g2: number, b2: number, a2: number, u2: number, v2: number,
		x3: number, y3: number, r3: number, g3: number, b3: number, a3: number, u3: number, v3: number,
		x4: number, y4: number, r4: number, g4: number, b4: number, a4: number, u4: number, v4: number
	): void {
		this.drawTriangleTextured(
			tex,
			x1, y1, r1, g1, b1, a1, u1, v1,
			x2, y2, r2, g2, b2, a2, u2, v2,
			x3, y3, r3, g3, b3, a3, u3, v3
		);
		this.drawTriangleTextured(
			tex,
			x1, y1, r1, g1, b1, a1, u1, v1,
			x3, y3, r3, g3, b3, a3, u3, v3,
			x4, y4, r4, g4, b4, a4, u4, v4
		);
	}

	// color
	setBlendmode(mode: BlendMode): void {
		if (mode === this.currentBlendMode) return;

		this.flush();
		this.currentBlendMode = mode;

		const gl = this.gl;
		switch (mode) {
			case BlendMode.Opaque:
				gl.disable(gl.BLEND);
				break;
			case BlendMode.Alpha:
				gl.enable(gl.BLEND);
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
				break;
			case BlendMode.Additive:
				gl.enable(gl.BLEND);
				gl.blendFunc(gl.ONE, gl.ONE);
				break;
			case BlendMode.Multiply:
				gl.enable(gl.BLEND);
				gl.blendFunc(gl.DST_COLOR, gl.ZERO);
				break;
			default:
				panic("unknown blendmode:" + mode);
		}
	}

	setColor(r: number, g: number, b: number, a?: number): void {
		const alpha = a ?? this.currentColor[3];
		this.currentColor[0] = r * alpha;
		this.currentColor[1] = g * alpha;
		this.currentColor[2] = b * alpha;
		this.currentColor[3] = alpha;
		this.currentSetColor[0] = r;
		this.currentSetColor[1] = g;
		this.currentSetColor[2] = b;
	}

	setAlpha(a: number): void {
		this.currentColor[0] = this.currentSetColor[0] * a;
		this.currentColor[1] = this.currentSetColor[1] * a;
		this.currentColor[2] = this.currentSetColor[2] * a;
		this.currentColor[3] = a;
	}

	// shapes
	drawPoint(x: number, y: number): void {
		this.drawRect(x, y, 1, 1)
	}

	drawTri(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
		const c = this.currentColor;
		this.drawTriangle(
			x1, y1, ...c,
			x2, y2, ...c,
			x3, y3, ...c
		);
	}

	drawCircle(cx: number, cy: number, radius: number, segments: number = 32): void {
		segments = Math.max(3, segments);
		const angleStep = (Math.PI * 2) / segments;
		let prevX = cx + Math.cos(0) * radius;
		let prevY = cy + Math.sin(0) * radius;

		for (let i = 1; i <= segments; i++) {
			const angle = i * angleStep;
			const nextX = cx + Math.cos(angle) * radius;
			const nextY = cy + Math.sin(angle) * radius;
			this.drawTri(
				cx, cy,
				prevX, prevY,
				nextX, nextY
			);
			prevX = nextX;
			prevY = nextY;
		}
	}

	drawRect(x: number, y: number, w: number, h: number): void {
		const c = this.currentColor;
		this.drawTriangle(
			x, y, ...c,
			x + w, y, ...c,
			x, y + h, ...c,
		);
		this.drawTriangle(
			x + w, y, ...c,
			x + w, y + h, ...c,
			x, y + h, ...c
		);
	}

	// textures
	loadTex(url: string): Promise<Texture> {
		const gl = this.gl;
		const texture = new Texture(gl);
		texture.bind(0);

		// Set texture parameters
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		// Placeholder 1x1 white pixel
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.whitePixel);

		return new Promise((resolve, reject) => {
			const image = new Image();
			image.crossOrigin = "anonymous";

			image.onload = () => {
				texture.bind(0);
				assert(
					image.width < this.MAX_TEXTURE_SIZE && image.height < this.MAX_TEXTURE_SIZE,
					"Max texture size (" + this.MAX_TEXTURE_SIZE + ") exceeded: " + url
				);
				// Draw image into canvas
				const ctx = this.premultiplyContext;
				ctx.clearRect(0, 0, image.width, image.height);
				ctx.drawImage(image, 0, 0);

				// Get pixel data
				const imageData = ctx.getImageData(0, 0, image.width, image.height);
				const data = imageData.data;

				// Premultiply alpha
				for (let i = 0; i < data.length; i += 4) {
					const alpha = data[i + 3] / 255;
					data[i + 0] = Math.round(data[i + 0] * alpha);
					data[i + 1] = Math.round(data[i + 1] * alpha);
					data[i + 2] = Math.round(data[i + 2] * alpha);
					// data[i + 3] stays the same
				}

				// Upload to GPU
				gl.texImage2D(
					gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0,
					gl.RGBA, gl.UNSIGNED_BYTE, data
				);

				texture.width = image.width;
				texture.height = image.height;

				gl.generateMipmap(gl.TEXTURE_2D);
				resolve(texture);
			};
			image.onerror = () => reject(new Error("Failed to load texture: " + url));
			image.src = url;
		});
	}

	drawTex(tex: Texture, x: number = 0.0, y: number = 0.0): void {
		const w = tex.width;
		const h = tex.height;
		const c = this.currentColor;
		this.drawTriangleTextured(
			tex,
			x, y, ...c, 0.0, 1.0,  // Bottom left (flipped v)
			x + w, y, ...c, 1.0, 1.0,   // Bottom right
			x, y + h, ...c, 0.0, 0.0    // Top left
		);
		this.drawTriangleTextured(
			tex,
			x + w, y, ...c, 1.0, 1.0,   // Bottom right
			x + w, y + h, ...c, 1.0, 0.0,    // Top right
			x, y + h, ...c, 0.0, 0.0    // Top left
		);
	}

	drawTexRect(tex: Texture, x: number, y: number, sourceX: number, sourceY: number, sourceWidth: number, sourceHeight: number): void {
		const w = tex.width;
		const h = tex.height;
		sourceX = clamp(sourceX, 0, w)
		sourceY = clamp(sourceY, 0, h)
		sourceWidth = clamp(sourceWidth, 0, w - sourceX)
		sourceHeight = clamp(sourceHeight, 0, h - sourceY)

		if (sourceWidth === 0 || sourceHeight === 0) {
			return
		}

		// this.logActiveUniforms(this.gl, this.currentShader.program)

		const u1 = sourceX / w;
		const v1 = 1 - sourceY / h;
		const u2 = (sourceX + sourceWidth) / w;
		const v2 = 1 - (sourceY + sourceHeight) / h;

		const c = this.currentColor;
		this.drawQuadTextured(
			tex,
			x, y, ...c, u1, v1,
			x + sourceWidth, y, ...c, u2, v1,
			x + sourceWidth, y + sourceHeight, ...c, u2, v2,
			x, y + sourceHeight, ...c, u1, v2
		);
	}

	// transforms
	translate(x: number, y: number): void {
		this.applyTransform(1, 0, 0, 1, x, y);
	}

	scale(sx: number, sy: number): void {
		this.applyTransform(sx, 0, 0, sy, 0, 0);
	}

	rotate(angle: number): void {
		this.applyTransform(Math.cos(angle), -Math.sin(angle), Math.sin(angle), Math.cos(angle), 0, 0);
	}

	applyTransform(ix: number, iy: number, jx: number, jy: number, tx: number, ty: number): void {
		const t = this.currentTransform;
		const ix2 = ix * t.ix + iy * t.jx;
		const iy2 = ix * t.iy + iy * t.jy;
		const jx2 = jx * t.ix + jy * t.jx;
		const jy2 = jx * t.iy + jy * t.jy;
		const tx2 = tx * t.ix + ty * t.jx + t.tx;
		const ty2 = tx * t.iy + ty * t.jy + t.ty;
		this.replaceTransform(ix2, iy2, jx2, jy2, tx2, ty2);
	}

	private replaceTransform(ix: number, iy: number, jx: number, jy: number, tx: number, ty: number): void {
		this.currentTransform.ix = ix;
		this.currentTransform.iy = iy
		this.currentTransform.jx = jx;
		this.currentTransform.jy = jy;
		this.currentTransform.tx = tx;
		this.currentTransform.ty = ty;
	}

	push(): void {
		const stack = this.transformStack;
		assert(stack.length < this.MAX_TRANSFORM_STACK_DEPTH, "Renderer: maxiumum push/pop depth reached. Check if you have mismatching push/pop operations.")
		stack.push({ ...this.currentTransform })
	}

	pop(): void {
		const stack = this.transformStack;
		const t = stack.pop();
		if (t) {
			this.currentTransform = t;
		}
	}

	origin(): void {
		this.replaceTransform(1, 0, 0, 1, 0, 0);
	}

	// shaders
	setShader(shader?: Shader): void {
		this.flush();
		if (!shader) {
			shader = this.defaultShader;
		}
		this.currentShader = shader;
		this.currentShader.use();
		shader.setUniform("Resolution", [this.viewportWidth, this.viewportHeight])
	}

	createShader(vs: string, fs: string): Shader {
		const gl = this.gl
		const program = createProgram(gl, vs, fs);
		const shader = new Shader(gl, program)
		return shader
	}

	createVertexShader(vs: string): Shader {
		const gl = this.gl
		const program = createProgram(gl, vs, this.defaultFragShader);
		const shader = new Shader(gl, program)
		return shader
	}

	createFragShader(fs: string): Shader {
		const gl = this.gl
		const program = createProgram(gl, this.defaultVsShader, fs);
		const shader = new Shader(gl, program)
		return shader
	}

	// render target
	createRenderTarget(width: number, height: number): RenderTarget {
		const gl = this.gl;
		const texture = new Texture(gl);
		texture.width = width;
		texture.height = height;

		gl.bindTexture(gl.TEXTURE_2D, texture.data);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			width,
			height,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			null
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		const framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.data, 0);

		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
			panic("Framebuffer is incomplete");
		}

		// Cleanup
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, null);

		return {
			texture,
			framebuffer,
			width,
			height
		};
	}

	setRenderTarget(rt?: RenderTarget): void {
		const gl = this.gl;
		this.flush();
		if (rt) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, rt.framebuffer);
			gl.viewport(0, 0, rt.texture.width, rt.texture.height);
			this.currentRenderTarget = rt;
			this.currentShader.setUniform("Resolution", [rt.width, rt.height]);
		} else {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, this.viewportWidth, this.viewportHeight);
			this.currentRenderTarget = null;
			this.currentShader.setUniform("Resolution", [this.viewportWidth, this.viewportHeight]);
		}
	}

	drawRenderTarget(rt: RenderTarget, x: number, y: number): void {
		this.push();
		this.scale(1, -1);
		this.drawTex(rt.texture, x, -y - rt.height);
		this.pop();
	}

	clearRenderTarget(color: Color = [0.0, 0.0, 0.0, 0.0]): void {
		const gl = this.gl;
		if (!this.currentRenderTarget) return;
		gl.clearColor(...color);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	destroyRenderTarget(rt: RenderTarget): void {
		const gl = this.gl;
		gl.deleteFramebuffer(rt.framebuffer);
		gl.deleteTexture(rt.texture.data);
	}




	// other
	getMetrics(): Readonly<RenderMetrics> {
		return this.metrics;
	}

	// private methods
	private setViewportSize(width: number, height: number): void {
		const gl = this.gl;
		const shader = this.currentShader;
		this.viewportWidth = width;
		this.viewportHeight = height;
		gl.viewport(0, 0, width, height);
		shader.setUniform("Resolution", [width, height])
	}

	private renderTargetHeight(): number {
		return this.currentRenderTarget
			? this.currentRenderTarget.height
			: this.viewportHeight;
	}

	private logActiveUniforms(gl: WebGL2RenderingContext, program: WebGLProgram): void {
		const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
		echo(`Active uniforms in program:`);

		for (let i = 0; i < numUniforms; ++i) {
			const info = gl.getActiveUniform(program, i);
			if (!info) continue;

			const name = info.name;
			const location = gl.getUniformLocation(program, name);
			if (location) {
				const value = gl.getUniform(program, location);
				echo(`${name} (${info.type}):`, value);
			}
		}
	}

}

function createProgram(
	gl: WebGL2RenderingContext,
	vertexShader: string | WebGLShader,
	fragmentShader: string | WebGLShader
): WebGLProgram {
	const vs = typeof vertexShader === "string"
		? compileShader(gl, gl.VERTEX_SHADER, vertexShader)!
		: vertexShader;
	const fs = typeof fragmentShader === "string"
		? compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader)!
		: fragmentShader;
	const program = gl.createProgram();
	if (!program) {
		panic("Failed to create program")
	}
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.bindAttribLocation(program, 0, "position");
	gl.bindAttribLocation(program, 1, "color");
	gl.bindAttribLocation(program, 2, "uv");
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		panic("Failed to link program:\n" + gl.getProgramInfoLog(program));
	}
	return program;
}

function compileShader(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
	const shader = gl.createShader(type);
	const version = "#version 300 es\nprecision highp float;\n";
	if (!shader) {
		panic("Failed to create shader");
	}
	gl.shaderSource(shader, version + source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		console.error(log);
		console.error(source);
		panic("Shader compilation failed");
	}
	return shader;
}
