export interface Renderer {
	beginFrame(): void
	drawTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void
	flush(): void
}

export class WebGLRenderer implements Renderer {
	private canvas: HTMLCanvasElement;
	private gl: WebGLRenderingContext;
	private program!: WebGLProgram;

	private vertexData: Float32Array;
	private vertexCount = 0;
	private positionBuffer!: WebGLBuffer;

	private readonly MAX_TRIANGLES = 1024;

	constructor(canvas: HTMLCanvasElement) {
		const gl = canvas.getContext("webgl");
		if (!gl) throw new Error("WebGL not supported");
		this.gl = gl;
		this.canvas = canvas;
		this.vertexData = new Float32Array(this.MAX_TRIANGLES * 6);
		this.init();
	}

	private init() {
		const gl = this.gl;

		// Vertex shader
		const vs = gl.createShader(gl.VERTEX_SHADER)!;
		gl.shaderSource(vs, `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0, 1);
      }
    `);
		gl.compileShader(vs);

		// Fragment shader
		const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
		gl.shaderSource(fs, `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(1, 0, 0, 1); // red
      }
    `);
		gl.compileShader(fs);

		// Link program
		const program = gl.createProgram()!;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		gl.useProgram(program);
		this.program = program;

		this.positionBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);

		const positionLoc = gl.getAttribLocation(this.program, "a_position");
		gl.enableVertexAttribArray(positionLoc);
		gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
	}

	beginFrame(): void {
		const gl = this.gl;
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		this.vertexCount = 0; // reset batching
	}

	drawTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
		const offset = this.vertexCount * 2;
		this.vertexData.set([x1, y1, x2, y2, x3, y3], offset);
		this.vertexCount += 3;
	}

	flush() {
		const gl = this.gl;

		// Bind and update vertex data
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexData.subarray(0, this.vertexCount * 2));

		gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
	}
}
