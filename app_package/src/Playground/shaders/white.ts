import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export function setup() {
    BABYLON.Effect.ShadersStore["whiteVertexShader"] = `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    // Uniforms
    uniform mat4 worldViewProjection;

    // Varying
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUV;

    void main(void) {
        vec4 outPosition = worldViewProjection * vec4(position, 1.0);
        gl_Position = outPosition;
        
        vUV = uv;
        vPosition = position;
        vNormal = normal;
    }
    `;

    BABYLON.Effect.ShadersStore["whiteFragmentShader"] = `
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
    `;
}