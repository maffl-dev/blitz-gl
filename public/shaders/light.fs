in vec4 Color;
in vec2 UV;
out vec4 FragColor;

uniform sampler2D Texture;
uniform vec2 Resolution;
uniform vec2 LightPos;
uniform float Radius;

void main() {
	vec2 pixelPos = UV * Resolution;
	float dist = distance(pixelPos, LightPos);
	float r = Radius;
	float intensity = clamp(1.0 - dist / r, 0.0, 1.0);
	vec4 texColor = texture(Texture, UV);
	FragColor = texColor * Color * intensity;
}