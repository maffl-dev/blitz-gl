#version 300 es
precision mediump float;

in vec4 v_color;
in vec2 v_uv;
uniform sampler2D u_texture;
uniform bool u_useTexture;
out vec4 fragColor;

void main() {
	if (u_useTexture) {
		vec4 texColor = texture(u_texture, vec2(v_uv.x, 1.0 - v_uv.y));
		fragColor = texColor * v_color;
	} else {
		fragColor = v_color;
	}
}