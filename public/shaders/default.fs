#version 300 es
precision mediump float;

in vec4 Color;
in vec2 UV;

uniform sampler2D Texture;

out vec4 FragColor;

void main() {
	vec4 color = texture(Texture, vec2(UV.x, 1.0 - UV.y)) * Color;
	FragColor = color;
}