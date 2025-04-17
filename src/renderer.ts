export interface Renderer {
	beginFrame(): void
	drawTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, r: number, g: number, b: number, a: number): void
	flush(): void
}

export class WebGLRenderer implements Renderer {
	private canvas: HTMLCanvasElement;
	private gl: WebGL2RenderingContext;

	private readonly MAX_TRIANGLES = 1024;

	private program!: WebGLProgram;
	private vertexBuffer!: WebGLBuffer;
	private vertexData!: Float32Array;
	private vertexCount = 0;

	constructor(canvas: HTMLCanvasElement) {
		const gl = canvas.getContext("webgl2");
		if (!gl) throw new Error("WebGL2 not supported");
		this.gl = gl;
		this.canvas = canvas;
		this.init();
	}

	private init() {
		const gl = this.gl;
		this.vertexData = new Float32Array(this.MAX_TRIANGLES * 3 * (2 + 4)); // 2 for position, 4 for color

		const vsSource = loadShader('/shaders/default.vs');
		const fsSource = loadShader('/shaders/default.fs');

		// Link program
		this.program = createProgram(gl, vsSource, fsSource);
		gl.useProgram(this.program);

		// Create and setup position buffer
		this.vertexBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);

		const positionLoc = gl.getAttribLocation(this.program, "a_position");
		const colorLoc = gl.getAttribLocation(this.program, "a_color");
		const stride = 6 * Float32Array.BYTES_PER_ELEMENT;
		gl.enableVertexAttribArray(positionLoc);
		gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);
		gl.enableVertexAttribArray(colorLoc);
		gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
	}

	beginFrame(): void {
		const gl = this.gl;
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		this.vertexCount = 0; // reset batching
	}

	drawTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, r: number, g: number, b: number, a: number) {
		const base = this.vertexCount * 6; // 6 floats per vertex
		this.vertexData.set([x1, y1, r, g, b, a], base + 0);
		this.vertexData.set([x2, y2, r, g, b, a], base + 6);
		this.vertexData.set([x3, y3, r, g, b, a], base + 12);
		this.vertexCount += 3;
	}

	flush() {
		const gl = this.gl;
		const VERTEX_STRIDE = 6; // floats per vertex

		// Bind and update vertex data
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexData.subarray(0, this.vertexCount * VERTEX_STRIDE));
		gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
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