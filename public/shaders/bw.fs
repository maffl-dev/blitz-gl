#version 300 es
precision mediump float;

in vec4 Color;
in vec2 UV;

uniform sampler2D Texture;
uniform bool UseTexture;
uniform float Level;

out vec4 FragColor;

void main() {
	vec4 color;
	
	if (UseTexture) {
		vec4 texColor = texture(Texture, vec2(UV.x, 1.0 - UV.y));
		color = texColor * Color;
	} else {
		color = Color;
	}
	
	// Apply grayscale blend
	float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
	vec3 desat = mix(color.rgb, vec3(gray), Level);
	FragColor = vec4(desat, color.a);
}
