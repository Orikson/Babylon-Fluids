import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export function setup() {
    BABYLON.Effect.IncludesShadersStore["stam3D_constants"] = `
    #define DENSITY 1.
    #define VISCOSITY 1.
    #define FORCEMULT 0.3
    `;

    BABYLON.Effect.IncludesShadersStore["stam3D_header"] = `
    precision highp float;

    varying vec2 vuv;

    // texture bounding box
    varying vec3 bbPosition;
    varying vec3 bbWorldSize;
    varying vec4 bbQuaternion;
    varying vec3 bbResolution;

    uniform float frame;        // frame count
    uniform float dt;           // delta time
    uniform vec2 mpos;          // current mouse position
    uniform vec2 rel;           // relative mouse movement (in pixels)
    uniform float mDown;        // if 0 mouse is up, else, mouse is down

    uniform sampler2D textureSampler; // previous rendering
    // --------------------------------------- ALL TEXTURES CAN GO HERE ---------------------------------------
    

    // Hamilton Product
    vec4 H(vec4 n1, vec4 n2) {
        float a1 = n1.x; float a2 = n2.x;
        float b1 = n1.y; float b2 = n2.y;
        float c1 = n1.z; float c2 = n2.z;
        float d1 = n1.w; float d2 = n2.w;

        return vec4(
            a1*a2-b1*b2-c1*c2-d1*d2,
            a1*b2+b1*a2+c1*d2-d1*c2,
            a1*c2-b1*d2+c1*a2+d1*b2,
            a1*d2+b1*c2-c1*b2+d1*a2
        );
    }

    // rotates a vector around a quaternion
    vec3 rotate(vec3 n, vec4 rot) {
        rot = vec4(rot.w, rot.xyz);
        vec4 quantN = vec4(0., n);
        vec4 rotPrime = vec4(rot.x, -rot.yzw);
    
        vec4 quantNPrime = H(H(rot, quantN), rotPrime);
    
        return quantNPrime.yzw;
    }
    
    // defines a quaternion
    vec4 quaternion(vec3 n, float theta) {
        return vec4(cos(theta/2.), sin(theta/2.)*n);
    }

    // reads from a texture and clamps 0, 0, 0 to boundaries
    vec4 texture2D_CTB(sampler2D x, vec2 uvt) {
        if (uvt.x < 0. || uvt.x > 1. || uvt.y < 0. || uvt.y > 1.) {
            return vec4(0., 0., 0., 1.);
        }
        return texture2D(x, uvt);
    }

    // TODO:
    // Convert all bbPos from center to origin (remove origin computation redundancy)

    // converts 3D position to 3D UV texture coordinates
    // given position of bounding box (position of texture in real world)
    // given dimensions of bounding box (dimension of texture in real world)
    // given rotation of bounding box (rotation of texture in real world) (as a quaternion)
    vec3 convertPUV(vec3 position, vec3 bbPos, vec3 bbDim, vec4 bbRot) {
        vec3 origin = bbPos - rotate(bbDim, bbRot) * 0.5;
        vec3 dir = position - origin;
        float sampw = dot(dir, rotate(vec3(1., 0., 0.), bbRot));
        float samph = dot(dir, rotate(vec3(0., 1., 0.), bbRot));
        float sampl = dot(dir, rotate(vec3(0., 0., 1.), bbRot));
        return vec3(sampw / bbDim.x, samph / bbDim.y, sampl / bbDim.z);
    }

    // inverse operation of above
    vec3 convertUVP(vec3 uvt, vec3 bbPos, vec3 bbDim, vec4 bbRot) {
        vec3 origin = bbPos - rotate(bbDim, bbRot) * 0.5;
        float sampw = uvt.x * bbDim.x;
        float samph = uvt.y * bbDim.y;
        float sampl = uvt.z * bbDim.z;
        vec3 sampdir = 
            sampw * rotate(vec3(1., 0., 0.), bbRot) + 
            samph * rotate(vec3(0., 1., 0.), bbRot) +
            sampl * rotate(vec3(0., 0., 1.), bbRot);
        return origin + sampdir;
    }

    // gets UV coordinates of 2D tex from 3D UV coordinates
    // given UV coords and resolution of texture
    vec2 getCoords(vec3 uvt, vec3 res) {
        return vec2((uvt.x + floor(uvt.z * res.z)) / res.z, uvt.y);
    }

    vec3 getUV3D(vec2 uvt, vec3 res) {
        float y = (floor(uvt.y * res.y) + 0.) / res.y;
        float value = floor(res.x * res.z * uvt.x) / res.x;
        float x = (floor(fract(value) * res.x) + 0.) / res.x;
        float z = (floor(value) + 0.) / res.z;
        return vec3(x, y, z);
    }

    // reads from a 3D texture given UV3D coordinate and resolution and clamps 0, 0, 0 to boundaries
    vec4 texture3D_CTB(sampler2D x, vec3 uv3d, vec3 res) {
        if (uv3d.x < 0. || uv3d.x > 1. || uv3d.y < 0. || uv3d.y > 1. || uv3d.z < 0. || uv3d.z > 1.) {
            return vec4(0., 0., 0., 1.);
        }
        return texture2D(x, getCoords(uv3d, res));
    }

    // reads from a 3D texture given any position in real space and a definition of a bounded box (position, dimension, and quaternion), clamps 0, 0, 0, to boundaries
    vec4 texture3D_CTB_BB(sampler2D x, vec3 pos, vec3 res, vec3 bbPos, vec3 bbDim, vec4 bbRot) {
        vec3 uv3d = convertPUV(pos, bbPos, bbDim, bbRot);
        return texture3D_CTB(x, uv3d, res);
    }

    vec4 texture3D_rndC(sampler2D x, vec3 u, vec3 resolution) {
        vec3 U = u * resolution;
        vec3 F = fract(U);
        U = floor(U) + F*F*F*(F*(F*6.-15.)+10.);
        return texture2D_CTB(x, getCoords((U - 0.5) / resolution, resolution));
    }

    vec4 texture3D_rndC_BB(sampler2D x, vec3 pos, vec3 res, vec3 bbPos, vec3 bbDim, vec4 bbRot) {
        vec3 uv3d = convertPUV(pos, bbPos, bbDim, bbRot);
        if (uv3d.x < 0. || uv3d.x > 1. || uv3d.y < 0. || uv3d.y > 1. || uv3d.z < 0. || uv3d.z > 1.) {
            return vec4(0., 0., 0., 1.);
        }
        return texture3D_rndC(x, uv3d, res);
    }
    `

    // TODO:
    // no difference with 2D equivalent, consider merge
    BABYLON.Effect.IncludesShadersStore["stam3D_vertex"] = `
    precision highp float;
    
    // attributes
    attribute vec2 position;

    // varying
    varying vec2 vuv;
    
    // bounding box
    varying vec3 bbPosition;
    varying vec3 bbWorldSize;
    varying vec4 bbQuaternion;
    varying vec3 bbResolution;

    // uniforms
    uniform vec3 bbPos;
    uniform vec3 bbDim;
    uniform vec4 bbRot;
    uniform vec3 bbRes;

    void main(void) {
        gl_Position = vec4(position, 0., 1.);
        vuv = (position + 1.) * 0.5;

        bbPosition = bbPos;
        bbWorldSize = bbDim;
        bbQuaternion = bbRot;
        bbResolution = bbRes;
    }
    `
}