import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export function setup() {
    BABYLON.Effect.ShadersStore["exampleVertexShader"] = `
    precision highp float;

    // Attributes
    attribute vec2 position;
    //attribute vec2 uv;

    // Uniforms
    uniform mat4 worldViewProjection;

    // Varying
    varying vec2 vUV;

    void main(void) {
        gl_Position = vec4(position, 0., 1.);//worldViewProjection * vec4(position, 1.0);

        vUV = (position + 1.)/2.;
    }
    `;

    BABYLON.Effect.ShadersStore["exampleFragmentShader"] = `
    precision highp float;

    varying vec2 vUV;

    uniform float time;

    void main(void) {
        gl_FragColor = vec4(vUV, 0., 1.);
        //gl_FragColor = vec4(1., 0., 1., 1.);
    }
    `;
}