import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export function setup() {
    BABYLON.Effect.ShadersStore["exampleVertexShader"] = `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec2 uv;

    // Uniforms
    uniform mat4 worldViewProjection;

    // Varying
    varying vec2 vUV;

    void main(void) {
        gl_Position = worldViewProjection * vec4(position, 1.0);

        vUV = uv;
    }
    `;

    BABYLON.Effect.ShadersStore["exampleFragmentShader"] = `
    precision highp float;

    varying vec2 vUV;

    uniform float time;

    void main(void) {
        gl_FragColor = vec4(vUV.x + cos(time/1000.), vUV.y, 0., 1.);
    }
    `;
}