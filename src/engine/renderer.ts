import { black, Color, white } from "./colors";
import { assert, clamp } from "./utils";

export interface Renderer {
	// low level basics
	beginFrame(): void
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
	loadTex(url: string): Texture
	drawTex(tex: Texture, x: number, y: number): void
	drawTexRect(tex: Texture, x: number, y: number, sourceX: number, sourceY: number, sourceWidth: number, sourceHeight: number): void

	// transform
	translate(x: number, y: number): void
	rotate(angle: number): void
	scale(sx: number, sy: number): void
	applyTransform(ix: number, iy: number, jx: number, jy: number, tx: number, ty: number): void
	push(): void
	pop(): void

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
			throw new Error("Failed to create Texture");
		}
	}

	bind(unit: number = 0): void {
		this.gl.activeTexture(this.gl.TEXTURE0 + unit);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.data);
	}
}

export interface RenderMetrics {
	cpuFrameTime: number
	gpuFrameTime: number
	drawCalls: number
	triangleCount: number
}

interface RenderTransform {
	ix: number, iy: number,
	jx: number, jy: number
	tx: number, ty: number
}

export class WebGLRenderer implements Renderer {
	private canvas: HTMLCanvasElement;
	private viewportWidth!: number;
	private viewportHeight!: number;
	private gl: WebGL2RenderingContext;

	private readonly MAX_TRIANGLES = 1024;
	private readonly VERTEX_SIZE = 8; // 2 for position, 4 for color, 2 for uv
	private readonly MAX_TRANSFORM_STACK_DEPTH = 256;

	private program!: WebGLProgram;
	private vertexBuffer!: WebGLBuffer;
	private vertexData!: Float32Array;
	private vertexCount = 0;
	private useTextureLoc!: WebGLUniformLocation | null;
	private textureEnabled: boolean = false;
	private resolutionLoc!: WebGLUniformLocation | null;

	// state
	private currentTexture: Texture | null = null;
	private currentColor: Color = [...white];
	private currentBlendMode: BlendMode = BlendMode.Opaque;
	private currentTransform: RenderTransform = {
		ix: 1, iy: 0,
		jx: 0, jy: 1,
		tx: 0, ty: 0
	};
	private transformStack: Array<RenderTransform> = []

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
		if (!gl) throw new Error("WebGL2 not supported");
		this.gl = gl;
		this.canvas = canvas;
		this.initGL();
		this.setViewportSize(canvas.width, canvas.height);
	}

	private initGL() {
		const gl = this.gl;
		this.vertexData = new Float32Array(this.MAX_TRIANGLES * 3 * this.VERTEX_SIZE); // 2 for position, 4 for color, 2 for uv

		const vsSource = loadShader('/shaders/default.vs');
		const fsSource = loadShader('/shaders/default.fs');

		// Link program
		this.program = createProgram(gl, vsSource, fsSource);
		gl.useProgram(this.program);

		// Create and setup position buffer
		this.vertexBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);

		const stride = this.VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT;

		// Position attribute
		const positionLoc = gl.getAttribLocation(this.program, "a_position");
		if (positionLoc === -1) throw new Error("a_position not found in shader");
		gl.enableVertexAttribArray(positionLoc);
		gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);

		// Color attribute
		const colorLoc = gl.getAttribLocation(this.program, "a_color");
		if (colorLoc === -1) throw new Error("a_color not found in shader");
		gl.enableVertexAttribArray(colorLoc);
		gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

		// UV attribute
		const uvLoc = gl.getAttribLocation(this.program, "a_uv");
		if (uvLoc === -1) throw new Error("a_uv not found in shader");
		gl.enableVertexAttribArray(uvLoc);
		gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);

		// Store uniform location for runtime toggle (optional)
		this.useTextureLoc = gl.getUniformLocation(this.program, "u_useTexture");
		if (!this.useTextureLoc) throw new Error("u_useTexture uniform not found in shader");

		// Default to not using textures initially
		gl.uniform1i(this.useTextureLoc, this.textureEnabled ? 1 : 0);

		// resolution info
		this.resolutionLoc = gl.getUniformLocation(this.program, "u_resolution")!
		if (!this.resolutionLoc) throw new Error("u_resolution uniform not found in vs shader");

		this.extTimerQuery = gl.getExtension("EXT_disjoint_timer_query_webgl2");
		if (!this.extTimerQuery) {
			console.warn("gpuFrameTime will not be measured. Browser does not support EXT_disjoint_timer_query_webgl2")
		}
	}

	beginFrame(): void {
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

		gl.viewport(0, 0, this.viewportWidth, this.viewportHeight);
		gl.clearColor(...black);
		gl.clear(gl.COLOR_BUFFER_BIT);
		this.vertexCount = 0;
		this.textureEnabled = false;
		this.setColor(...white);
		this.setBlendmode(BlendMode.Alpha);
		this.replaceTransform(1, 0, 0, 1, 0, 0);
		this.transformStack.length = 0;
	}

	flush(): void {
		const gl = this.gl;

		if (this.vertexCount === 0) return;

		if (this.textureEnabled && this.currentTexture) {
			this.currentTexture.bind();
		} else {
			gl.bindTexture(gl.TEXTURE_2D, null); // Optional: explicitly unbind texture
		}

		// Bind and update vertex data
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexData.subarray(0, this.vertexCount * this.VERTEX_SIZE));

		gl.uniform1i(this.useTextureLoc, this.textureEnabled ? 1 : 0);
		gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

		this.metrics.drawCalls++;
		this.metrics.triangleCount += this.vertexCount / 3;

		this.vertexCount = 0;
		this.textureEnabled = false;
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

		// console.log(this.metrics);
	}

	// low level draw funcs (unaffected by setColor())
	drawTriangle(
		x1: number, y1: number, r1: number, g1: number, b1: number, a1: number,
		x2: number, y2: number, r2: number, g2: number, b2: number, a2: number,
		x3: number, y3: number, r3: number, g3: number, b3: number, a3: number
	): void {
		const t = this.currentTransform;
		const tx1 = x1 * t.ix + y1 * t.jx + t.tx;
		const ty1 = x1 * t.iy + y1 * t.jy + t.ty;
		const tx2 = x2 * t.ix + y2 * t.jx + t.tx;
		const ty2 = x2 * t.iy + y2 * t.jy + t.ty;
		const tx3 = x3 * t.ix + y3 * t.jx + t.tx;
		const ty3 = x3 * t.iy + y3 * t.jy + t.ty;
		if (this.textureEnabled) {
			this.flush();
			this.textureEnabled = false;
		}
		const base = this.vertexCount * this.VERTEX_SIZE;
		this.vertexData.set([tx1, ty1, r1, g1, b1, a1, 0.0, 0.0], base);
		this.vertexData.set([tx2, ty2, r2, g2, b2, a2, 0.0, 0.0], base + this.VERTEX_SIZE);
		this.vertexData.set([tx3, ty3, r3, g3, b3, a3, 0.0, 0.0], base + this.VERTEX_SIZE * 2);
		this.vertexCount += 3;
	}

	drawTriangleTextured(
		tex: Texture,
		x1: number, y1: number, r1: number, g1: number, b1: number, a1: number, u1: number, v1: number,
		x2: number, y2: number, r2: number, g2: number, b2: number, a2: number, u2: number, v2: number,
		x3: number, y3: number, r3: number, g3: number, b3: number, a3: number, u3: number, v3: number
	): void {
		const t = this.currentTransform;
		const tx1 = x1 * t.ix + y1 * t.jx + t.tx;
		const ty1 = x1 * t.iy + y1 * t.jy + t.ty;
		const tx2 = x2 * t.ix + y2 * t.jx + t.tx;
		const ty2 = x2 * t.iy + y2 * t.jy + t.ty;
		const tx3 = x3 * t.ix + y3 * t.jx + t.tx;
		const ty3 = x3 * t.iy + y3 * t.jy + t.ty;
		if (!this.textureEnabled || this.currentTexture !== tex) {
			this.flush();
			this.textureEnabled = true;
			this.currentTexture = tex;
			this.currentTexture.bind();
		}
		const base = this.vertexCount * this.VERTEX_SIZE;
		this.vertexData.set([
			tx1, ty1, r1, g1, b1, a1, u1, v1,
			tx2, ty2, r2, g2, b2, a2, u2, v2,
			tx3, ty3, r3, g3, b3, a3, u3, v3
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
		// Draw first triangle of quad
		this.drawTriangleTextured(
			tex,
			x1, y1, r1, g1, b1, a1, u1, v1,
			x2, y2, r2, g2, b2, a2, u2, v2,
			x3, y3, r3, g3, b3, a3, u3, v3
		);
		// Draw second triangle of quad
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
				throw new Error("unknown blendmode:" + mode);
		}
	}

	setColor(r: number, g: number, b: number, a?: number): void {
		this.currentColor[0] = r
		this.currentColor[1] = g
		this.currentColor[2] = b
		this.currentColor[3] = a ?? this.currentColor[3];
	}

	setAlpha(a: number): void {
		this.currentColor[3] = a
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
	loadTex(url: string): Texture {
		const gl = this.gl;
		const texture = new Texture(gl);
		texture.bind(0)

		// Set texture parameters (wrapping and filtering)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		// Load a 1x1 white pixel initially to prevent a blank canvas
		const whitePixel = new Uint8Array([255, 255, 255, 255]); // RGBA white pixel
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, whitePixel);

		// Load the image asynchronously
		const image = new Image();
		image.onload = () => {
			// Once the image is loaded, upload it to the texture
			texture.bind(0);
			gl.texImage2D(
				gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image
			);
			texture.width = image.width;
			texture.height = image.height;

			// Mipmap generation (optional, but useful for scaling textures)
			gl.generateMipmap(gl.TEXTURE_2D);
		};

		image.src = url;
		return texture;
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

	// other
	getMetrics(): Readonly<RenderMetrics> {
		return this.metrics;
	}

	// private methods
	private setViewportSize(width: number, height: number): void {
		const gl = this.gl;
		this.viewportWidth = width;
		this.viewportHeight = height;
		gl.viewport(0, 0, width, height);
		gl.useProgram(this.program);
		gl.uniform2f(this.resolutionLoc, width, height);
	}

}

function loadShader(path: string): string {
	const request = new XMLHttpRequest();
	request.open('GET', path, false);  // false makes the request synchronous
	request.send(null);

	if (request.status === 200) {
		return request.responseText;
	} else {
		throw new Error(`Failed to load shader: ${path}`);
	}
}

function createProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram {
	const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource)!;
	const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource)!;
	const program = gl.createProgram();
	if (!program) {
		throw new Error("Failed to create program")
	}
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		throw new Error("Failed to link program:\n" + gl.getProgramInfoLog(program));
	}
	return program;
}

function compileShader(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) {
		throw new Error("Failed to create shader");
	}
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		console.error(log);
		throw new Error("Shader compilation failed");
	}
	return shader;
}