in vec4 Color;
in vec2 UV;

uniform sampler2D Texture;
uniform float Level;

out vec4 FragColor;

void main() {
	vec4 color = texture(Texture, UV) * Color;
	
	// Apply grayscale blend
	float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
	vec3 desat = mix(color.rgb, vec3(gray), Level);
	FragColor = vec4(desat, color.a);
}
