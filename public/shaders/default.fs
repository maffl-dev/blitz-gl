in vec4 Color;
in vec2 UV;

uniform sampler2D Texture;

out vec4 FragColor;

void main() {
	vec4 color = texture(Texture, UV) * Color;
	FragColor = color;
}