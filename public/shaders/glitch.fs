in vec4 Color;
in vec2 UV;
uniform sampler2D Texture;
uniform float Time;
uniform float Strength; // default = 0.2, 1.0 = full
uniform float Amount; // slower = 0.0, 1.0 = faster
out vec4 FragColor;

float rand(vec2 co) {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
	vec2 uv = UV;
	vec4 color = texture(Texture, uv) * Color;
	float alpha = color.a;
	float amount = min(Amount, 0.9982 * 5.0);
	if (rand(vec2(Time, Time * uv.y)) > 0.9982 - amount*0.2) {
		uv.x -= sin(Time) * 0.02 * Strength;
	}
	vec3 result = vec3(texture(Texture, uv).rgb);
	FragColor = vec4(result, 1.0) * alpha;
}
