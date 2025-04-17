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
	private vertexData!: Float32Array;
	private vertexCount = 0;
	private vertexBuffer!: WebGLBuffer;

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

		const vsSource = `#version 300 es
		precision mediump float;
		in vec2 a_position;
		in vec4 a_color;
		out vec4 v_color;
		void main() {
			gl_Position = vec4(a_position, 0, 1);
			v_color = a_color;
		}
   	 	`;
		const fsSource = `#version 300 es
			precision mediump float;
			in vec4 v_color;
			out vec4 outColor;
			void main() {
				outColor = v_color;
			}
    	`;
		const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource)!;
		const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource)!;

		// Link program
		const program = gl.createProgram()!;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		gl.useProgram(program);
		this.program = program;

		// Create and setup position buffer
		this.vertexBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);

		const positionLoc = gl.getAttribLocation(program, "a_position");
		const colorLoc = gl.getAttribLocation(program, "a_color");
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