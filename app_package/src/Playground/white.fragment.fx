precision highp float;

// Varying
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUV;

// Uniforms
uniform mat4 world;

// Refs
uniform vec3 cameraPosition;

// Lights
uniform vec3 lightPos;

void main(void) {
    gl_FragColor = vec4(0.3, 0.5, 1.0, 1.0);
}