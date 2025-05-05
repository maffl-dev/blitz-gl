#version 300 es
precision mediump float;

in vec4 Color;
in vec2 UV;

uniform sampler2D Texture;
uniform bool UseTexture;

out vec4 FragColor;

void main() {
	if (UseTexture) {
		vec4 texColor = texture(Texture, vec2(UV.x, 1.0 - UV.y));
		FragColor = texColor * Color;
	} else {
		FragColor = Color;
	}
}