import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export function setup() {
    BABYLON.Effect.IncludesShadersStore["stam2D_constants"] = `
    #define DENSITY 1.
    #define VISCOSITY 1.
    #define FORCEMULT 0.3
    `;

    BABYLON.Effect.IncludesShadersStore["stam2D_header"] = `
    precision highp float;

    varying vec2 vuv;

    uniform float frame;        // frame count
    uniform float dt;           // delta time
    uniform vec2 res;           // window resolution
    uniform vec2 mpos;          // current mouse position
    uniform vec2 rel;           // relative mouse movement (in pixels)
    uniform float mDown;        // if 0 mouse is up, else, mouse is down

    uniform sampler2D velTex;   // velocity texture
    uniform sampler2D tmpTex;   // temporary texture
    uniform sampler2D prsTex;   // pressure texture
    uniform sampler2D qntTex;   // quantity texture

    // casts -1 .. 1 values to 0 .. 1
    vec4 unsignRes(vec4 fvalue) {
        return 0.5 * fvalue + 0.5;
    }

    // casts 0 .. 1 values to -1 .. 1
    vec4 signRes(vec4 fvalue) {
        return 2. * fvalue - 1.;
    }

    // reads from a texture and clamps 0, 0, 0 to boundaries
    vec4 texture2D_CTB(sampler2D x, vec2 uvt) {
        if (uvt.x < 0. || uvt.x > 1. || uvt.y < 0. || uvt.y > 1.) {
            return vec4(0., 0., 0., 1.);
        }
        return texture2D(x, uvt);
    }
    `

    BABYLON.Effect.IncludesShadersStore["stam2D_vertex"] = `
    precision highp float;
    
    // attributes
    attribute vec3 position;
    attribute vec2 uv;

    // uniforms
    uniform mat4 worldViewProjection;

    // varying
    varying vec2 vuv;

    void main(void) {
        vuv = uv;
        gl_Position = worldViewProjection * vec4(position, 1.0);
    }
    `
}