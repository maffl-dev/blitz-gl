in vec4 Color;
in vec2 UV;
out vec4 FragColor;

uniform sampler2D Texture;
uniform sampler2D NormalTexture;
uniform sampler2D LightRamp;
uniform vec2 Resolution;
uniform vec2 LightPos;
uniform float Radius;

void main() {
    // Sample normal and convert from [0,1] to [-1,1]
	vec2 flippedUVs = vec2(UV.x, 1.0 - UV.y);
    vec3 normal = texture(NormalTexture, flippedUVs).rgb * 2.0 - 1.0;
    normal = normalize(normal);
	vec4 texColor = texture(Texture, flippedUVs);

    // Light direction from pixel to light (z=1 to simulate 2.5D)
	vec2 pixelPos = UV * Resolution;
    vec3 lightDir = normalize(vec3(LightPos - pixelPos, 100.0));

    // Directional lighting
	float NdotL = max(dot(normal, lightDir), 0.0);

	// Distance falloff
	float dist = distance(pixelPos, LightPos);
	float intensity = clamp(1.0 - dist / Radius, 0.0, 1.0);

	// Lookup ramp lighting
	float rampLight = texture(LightRamp, vec2(NdotL, 0.0)).r;

	// Final light
	float lighting = rampLight * intensity * 2.0;
    FragColor = texColor * Color * lighting;
}