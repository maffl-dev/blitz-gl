#version 300 es
precision mediump float;

in vec2 a_position;
in vec4 a_color;
in vec2 a_uv;

uniform vec2 u_resolution;

out vec4 v_color;
out vec2 v_uv;

void main() {
	// Convert from pixels to clipspace
	vec2 zeroToOne = a_position / u_resolution;
	vec2 zeroToTwo = zeroToOne * 2.0;
	vec2 clipSpace = zeroToTwo - 1.0;
	
	// Flip Y to make origin top-left
	gl_Position = vec4(clipSpace * vec2(1, - 1), 0, 1);
	v_color = a_color;
	v_uv = a_uv;
}