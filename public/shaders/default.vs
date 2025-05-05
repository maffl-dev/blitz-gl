in vec2 position;
in vec4 color;
in vec2 uv;

uniform vec2 Resolution;

out vec4 Color;
out vec2 UV;

void main() {
	// Convert from pixels to clipspace
	vec2 zeroToOne = position / Resolution;
	vec2 zeroToTwo = zeroToOne * 2.0;
	vec2 clipSpace = zeroToTwo - 1.0;
	
	// Flip Y to make origin top-left
	gl_Position = vec4(clipSpace * vec2(1, - 1), 0, 1);
	Color = color;
	UV = uv;
}