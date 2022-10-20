import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

// Relevant functions to render to plane
/*
Rendering to a plane requires a few steps:
1. Create render target texture (destination for rendering), and attach to scene            BABYLON.RenderTargetTexture
2. Create scene objects to add to render target texture                                     renderTarget.renderList.push
    a. if rendering slices of real objects, continue
    b. if rendering from texture w/ shader, render to a plane covering the entire screen
3. Create render-independent camera (by constructing relevant matrices)                     
4. Pass all values to shaders
*/

export class PlaneShader {
    //static camera: BABYLON.Camera = new BABYLON.Camera("planeShaderCamera", );
    plane: BABYLON.Mesh;
    shader: BABYLON.ShaderMaterial;

    texture: BABYLON.RenderTargetTexture;
    width: number;
    height: number;

    /* The way this works is as follows:
    1. There exists some BABYLON.RenderTargetTexture paired with an object of this class
    2. This class constructs a plane to be added to the render target using renderTarget.renderList.push
        this plane cannot be reused for all PlaneShader objects as it has a unique shader material
    3. This class contains a camera to be used by the render target setting renderTarget.activeCamera
        this camera can be reused for all PlaneShader objects
    4. This class constructs a shader material that will be applied to the unique plane
    */
    constructor(name: string, w: number, h: number) {
        this.width = w; this.height = h;
        this.texture = new BABYLON.RenderTargetTexture(name, { width: w, height: h });
    }
}

