#version 300 es
precision mediump float;

in vec4 v_color;
in vec2 v_uv;

uniform sampler2D u_texture;
uniform bool u_useTexture;
uniform float u_Level;

out vec4 fragColor;

void main() {
	vec4 color;
	
	if (u_useTexture) {
		vec4 texColor = texture(u_texture, vec2(v_uv.x, 1.0 - v_uv.y));
		color = texColor * v_color;
	} else {
		color = v_color;
	}
	
	// Apply grayscale blend
	float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
	vec3 desat = mix(color.rgb, vec3(gray), u_Level);
	fragColor = vec4(desat, color.a);
}
