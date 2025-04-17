#version 300 es
precision mediump float;
in vec2 a_position;
in vec4 a_color;
out vec4 v_color;
void main() {
    gl_Position = vec4(a_position, 0, 1);
    v_color = a_color;
} 