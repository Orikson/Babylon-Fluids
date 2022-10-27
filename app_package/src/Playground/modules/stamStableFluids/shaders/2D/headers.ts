import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export function setup() {
    BABYLON.Effect.IncludesShadersStore["stam2D_constants"] = `
    #define DENSITY 1
    #define VISCOSITY 1
    #define FORCEMULT 0.3
    `;

    BABYLON.Effect.IncludesShadersStore["stam2D_header"] = `
    precision highp float;

    varying vec2 uv;

    uniform int frame;          // frame count
    uniform float dt;           // delta time
    uniform vec2 res;           // window resolution
    uniform vec2 mpos;          // current mouse position
    uniform vec2 rel;           // relative mouse movement (in pixels)
    uniform int mDown;          // if 0 mouse is up, else, mouse is down

    uniform sampler2D velTex;   // velocity texture
    uniform sampler2D tmpTex;   // temporary texture
    uniform sampler2D prsTex;   // pressure texture
    uniform sampler2D qntTex;   // quantity texture

    float delx = 1 / res.x;
    float dely = 1 / res.y;
    `

    BABYLON.Effect.IncludesShadersStore["stam2D_vertex"] = `
    precision highp float;
    
    // attributes
    attribute vec3 position;
    attribute vec2 vUV;

    // uniforms
    uniform mat4 worldViewProjection;

    // varying
    varying vec2 uv;

    void main(void) {
        uv = vUV;
        gl_Position = worldViewProjection * vec4(position, 1.0);
    }
    `
}