#version 300 es
precision mediump float;

in vec2 a_position;
in vec4 a_color;
in vec2 a_uv;

out vec4 v_color;
out vec2 v_uv;

void main() {
	gl_Position = vec4(a_position, 0, 1);
	v_color = a_color;
	v_uv = a_uv;
}