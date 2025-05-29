in vec4 Color;
in vec2 UV;
out vec4 FragColor;

uniform sampler2D Texture;
uniform sampler2D NormalTexture;
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

    // Diffuse lighting via Lambert
    float diff = max(dot(normal, lightDir), 0.0);

    // distance falloff
    float dist = distance(pixelPos, LightPos);
    float intensity = clamp(1.0 - dist / Radius, 0.0, 1.0);

    // Final light
    float lighting = smoothstep(0.9, 0.0, dist / Radius) * pow(diff, 0.3);
	lighting = lighting * intensity * 2.0;
    FragColor = texColor * Color * lighting;
}