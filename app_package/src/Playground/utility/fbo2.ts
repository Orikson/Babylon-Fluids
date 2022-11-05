import * as BABYLON from "@babylonjs/core";
import { IMultiRenderTargetOptions } from "@babylonjs/core/Materials/Textures/multiRenderTarget";
import "@babylonjs/loaders";

// 2D FBO
export class FBO_2D {
    // ----- Babylon -----
    scene: BABYLON.Scene;
    engine: BABYLON.Engine;

    // ----- FBO -----
    fbo: BABYLON.RenderTargetWrapper;

    // ----- Constructor -----
    constructor(scene: BABYLON.Scene, dimensions: { width: number, height: number }, options: any) {
        this.scene = scene;
        this.engine = scene.getEngine();

        this.fbo = this.engine.createRenderTargetTexture(dimensions, options);
    }

    // ----- Renderer -----
    render(effect: BABYLON.EffectWrapper, renderer: BABYLON.EffectRenderer) {
        renderer.render(effect, this.fbo);
    }
}

// creates "3D" texture by creating a very large 2D texture
export class FBO_3D {
    // ----- FBO -----
    fbo: FBO_2D;

    // ----- Constructor ------
    constructor(scene: BABYLON.Scene, dimensions: { width: number, height: number, layers: number }, options: any) {
        this.fbo = new FBO_2D(scene, {
            width: dimensions.width * dimensions.layers,
            height: dimensions.height
        }, options);
    }

    // ----- Renderer -----
    render(effect: BABYLON.EffectWrapper, renderer: BABYLON.EffectRenderer) {
        this.fbo.render(effect, renderer);
    }
}

export class Multi_FBO {
    // ----- Babylon -----
    scene: BABYLON.Scene;
    engine: BABYLON.Engine;

    // ----- FBO -----
    fbo: BABYLON.RenderTargetWrapper;

    // ----- Constructor -----
    constructor(scene: BABYLON.Scene, dimensions: { width: number, height: number }, options: IMultiRenderTargetOptions) {
        this.scene = scene;
        this.engine = scene.getEngine();

        this.fbo = this.engine.createMultipleRenderTarget(dimensions, options, true);
    }

    // ----- Renderer -----
    render(effect: BABYLON.EffectWrapper, renderer: BABYLON.EffectRenderer) {
        renderer.render(effect, this.fbo);
    }
}