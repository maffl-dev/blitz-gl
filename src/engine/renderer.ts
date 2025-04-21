import { black, Color, white } from "./colors";

export interface GLTexture extends WebGLTexture {
	width: number;
	height: number;
}

export interface Renderer {
	// low level basics
	beginFrame(): void
	flush(): void

	// low level drawing funcs
	drawTriangle(
		x1: number, y1: number, r1: number, g1: number, b1: number, a1: number,
		x2: number, y2: number, r2: number, g2: number, b2: number, a2: number,
		x3: number, y3: number, r3: number, g3: number, b3: number, a3: number
	): void
	drawTriangleTextured(
		tex: WebGLTexture,
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
		tex: WebGLTexture,
		x1: number, y1: number, r1: number, g1: number, b1: number, a1: number, u1: number, v1: number,
		x2: number, y2: number, r2: number, g2: number, b2: number, a2: number, u2: number, v2: number,
		x3: number, y3: number, r3: number, g3: number, b3: number, a3: number, u3: number, v3: number,
		x4: number, y4: number, r4: number, g4: number, b4: number, a4: number, u4: number, v4: number
	): void

	// color
	setBlendmode(mode: BlendMode): void
	setColor(r: number, g: number, b: number, a?: number): void
	setAlpha(a: number): void;

	// textures
	loadTex(url: string): GLTexture
	drawTex(tex: GLTexture, x: number, y: number): void

}

enum BlendMode {
	Opaque,
	Alpha,
	Additive,
	Multiply,
}

export class WebGLRenderer implements Renderer {
	private canvas: HTMLCanvasElement;
	private viewportWidth!: number;
	private viewportHeight!: number;
	private gl: WebGL2RenderingContext;

	private readonly MAX_TRIANGLES = 1024;
	private readonly VERTEX_SIZE = 8; // 2 for position, 4 for color, 2 for uv

	private program!: WebGLProgram;
	private vertexBuffer!: WebGLBuffer;
	private vertexData!: Float32Array;
	private vertexCount = 0;
	private useTextureLoc!: WebGLUniformLocation | null;
	private textureEnabled: boolean = false;
	private resolutionLoc!: WebGLUniformLocation | null;
	private currentTexture: WebGLTexture | null = null;
	private currentColor: Color = [...white];

	constructor(canvas: HTMLCanvasElement) {
		const gl = canvas.getContext("webgl2");
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
	}

	beginFrame(): void {
		const gl = this.gl;
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.clearColor(...black);
		gl.clear(gl.COLOR_BUFFER_BIT);
		this.vertexCount = 0;
		this.textureEnabled = false;
		this.setColor(...white);
		this.setBlendmode(BlendMode.Alpha);
	}

	flush(): void {
		const gl = this.gl;

		if (this.textureEnabled && this.currentTexture) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.currentTexture);
		} else {
			gl.bindTexture(gl.TEXTURE_2D, null); // Optional: explicitly unbind texture
		}

		// Bind and update vertex data
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexData.subarray(0, this.vertexCount * this.VERTEX_SIZE));

		gl.uniform1i(this.useTextureLoc, this.textureEnabled ? 1 : 0);
		gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

		this.vertexCount = 0;
		this.textureEnabled = false;
	}

	// low level draw funcs
	drawTriangle(
		x1: number, y1: number, r1: number, g1: number, b1: number, a1: number,
		x2: number, y2: number, r2: number, g2: number, b2: number, a2: number,
		x3: number, y3: number, r3: number, g3: number, b3: number, a3: number
	): void {
		if (this.textureEnabled) {
			this.flush();
			this.textureEnabled = false;
		}
		const base = this.vertexCount * this.VERTEX_SIZE;
		this.vertexData.set([x1, y1, r1, g1, b1, a1, 0.0, 0.0], base);
		this.vertexData.set([x2, y2, r2, g2, b2, a2, 0.0, 0.0], base + this.VERTEX_SIZE);
		this.vertexData.set([x3, y3, r3, g3, b3, a3, 0.0, 0.0], base + this.VERTEX_SIZE * 2);
		this.vertexCount += 3;
	}

	drawTriangleTextured(
		tex: GLTexture,
		x1: number, y1: number, r1: number, g1: number, b1: number, a1: number, u1: number, v1: number,
		x2: number, y2: number, r2: number, g2: number, b2: number, a2: number, u2: number, v2: number,
		x3: number, y3: number, r3: number, g3: number, b3: number, a3: number, u3: number, v3: number
	): void {
		if (!this.textureEnabled || this.currentTexture !== tex) {
			this.flush();
			this.textureEnabled = true;
			this.currentTexture = tex;
			this.bindTexture(tex);
		}
		const base = this.vertexCount * this.VERTEX_SIZE;
		this.vertexData.set([
			x1, y1, r1, g1, b1, a1, u1, v1,
			x2, y2, r2, g2, b2, a2, u2, v2,
			x3, y3, r3, g3, b3, a3, u3, v3
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
		tex: GLTexture,
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

	// textures
	loadTex(url: string): GLTexture {
		const gl = this.gl;
		const texture = gl.createTexture() as GLTexture;
		if (!texture) {
			throw new Error("Failed to create texture");
		}

		// Bind the texture to texture unit 0
		gl.bindTexture(gl.TEXTURE_2D, texture);

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
			gl.bindTexture(gl.TEXTURE_2D, texture);
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

	drawTex(tex: GLTexture, x: number = 0.0, y: number = 0.0): void {
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


	// private methods
	private bindTexture(tex: GLTexture): void {
		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
	}

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