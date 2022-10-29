import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

import { PI } from "./constants";

// a better FBO with less overhead than creating entirely new scenes
// bind FBO, setup scene w/ shaders, render to FBO, continue
export class FBO {
    // ----- FBO -----
    fbo: WebGLFramebuffer | null;

    // ----- BABYLON -----
    scene: BABYLON.Scene;
    engine: BABYLON.Engine;

    // ----- GL Context -----
    static gl: WebGL2RenderingContext;

    // ----- Constructor -----
    constructor(scene: BABYLON.Scene, canvas: HTMLCanvasElement) {
        this.scene = scene;
        this.engine = scene.getEngine();

        FBO.gl = canvas.getContext("webgl2")!;
        let temp = FBO.gl?.createFramebuffer();
        if (temp != undefined) {
            this.fbo = temp;
        } else {
            this.fbo = null;
        }
    }

    // ----- Render -----
    bind(texture: WebGLTexture) {
        FBO.gl.bindFramebuffer(FBO.gl.FRAMEBUFFER, this.fbo);
        FBO.gl.framebufferTexture2D(FBO.gl.FRAMEBUFFER, FBO.gl.COLOR_ATTACHMENT0, FBO.gl.TEXTURE_2D, texture, 0);

        FBO.gl.clearColor(0., 0., 0., 1.);
        FBO.gl.clear(FBO.gl.COLOR_BUFFER_BIT);
    }

    unbind() {
        FBO.gl.flush();

        FBO.gl.framebufferTexture2D(FBO.gl.FRAMEBUFFER, FBO.gl.COLOR_ATTACHMENT0, FBO.gl.TEXTURE_2D, null, 0);
        FBO.gl.bindFramebuffer(FBO.gl.FRAMEBUFFER, null);
    }
}

// ----- Create effect -----
export function createEffect(engine: BABYLON.Engine, shaderPath: { vertex: string, fragment: string }, shaderOptions: { attributes: string[], uniforms: string[], samplers: string[] }): BABYLON.EffectWrapper {
    return new BABYLON.EffectWrapper({
        engine: engine,
        useShaderStore: true,
        vertexShader: shaderPath.vertex,
        fragmentShader: shaderPath.fragment,
        attributeNames: shaderOptions.attributes,
        uniformNames: shaderOptions.uniforms,
        samplerNames: shaderOptions.samplers
    });
}

export class BabylonFBO {
    // ----- Babylon -----
    scene: BABYLON.Scene;
    engine: BABYLON.Engine;

    // ----- FBO -----
    fbo: BABYLON.RenderTargetWrapper;

    // ----- Old render target -----
    old: BABYLON.RenderTargetWrapper | null;

    // ----- Render plane to screen (a general tool) -----
    static vbo: WebGLBuffer | null = null;
    static gl: WebGL2RenderingContext | null = null;
    static renderer: BABYLON.EffectRenderer | null = null;

    // ----- Constructor -----
    constructor(scene: BABYLON.Scene, dimensions: { width: number, height: number }, canvas: HTMLCanvasElement) {
        this.scene = scene;
        this.engine = scene.getEngine();

        this.fbo = this.engine.createRenderTargetTexture(dimensions, {
            generateMipMaps: false,
            type: BABYLON.Constants.TEXTURETYPE_FLOAT,
            format: BABYLON.Constants.TEXTUREFORMAT_RGBA,
            samplingMode: BABYLON.Constants.TEXTURE_NEAREST_SAMPLINGMODE
        });

        BabylonFBO.gl = canvas.getContext("webgl2");
        if (BabylonFBO.gl && BabylonFBO.vbo == null) {
            const vertices = new Float32Array([
                -1, 1, 1, 1, 1,-1,
                -1, 1, 1,-1,-1,-1
            ])

            BabylonFBO.vbo = BabylonFBO.gl.createBuffer();
            BabylonFBO.gl.bindBuffer(BabylonFBO.gl.ARRAY_BUFFER, BabylonFBO.vbo);
            BabylonFBO.gl.bufferData(BabylonFBO.gl.ARRAY_BUFFER, vertices, BabylonFBO.gl.STATIC_DRAW);
            BabylonFBO.gl.bindBuffer(BabylonFBO.gl.ARRAY_BUFFER, null);
        }

        if (BabylonFBO.renderer == null) {
            BabylonFBO.renderer = new BABYLON.EffectRenderer(this.engine);
        }
    }

    // ----- Bind/Unbind -----
    bind() {
        this.old = this.engine._currentRenderTarget;
        this.engine.bindFramebuffer(this.fbo);
    }
    unbind() {
        this.engine.unBindFramebuffer(this.fbo);
        if (this.old) {
            this.engine.bindFramebuffer(this.old);
        }
    }

    // ----- Render Plane -----
    renderPlane(positionAttribute: number) {
        if (BabylonFBO.gl != null && BabylonFBO.vbo != null) {
            BabylonFBO.gl.bindBuffer(BabylonFBO.gl.ARRAY_BUFFER, BabylonFBO.vbo);
            BabylonFBO.gl.enableVertexAttribArray(positionAttribute);
            BabylonFBO.gl.vertexAttribPointer(positionAttribute, 2, BabylonFBO.gl.FLOAT, false, 0, 0);
            BabylonFBO.gl.drawArrays(BabylonFBO.gl.TRIANGLES, 0, 6);
            BabylonFBO.gl.bindBuffer(BabylonFBO.gl.ARRAY_BUFFER, null);
        }
    }

    // ----- Renderer -----
    rbind(effect: BABYLON.EffectWrapper) {
        BabylonFBO.renderer!.applyEffectWrapper(effect);
        BabylonFBO.renderer!.bindBuffers(effect.effect);
    }
    runbind() {

    }
    render(effect: BABYLON.EffectWrapper) {
        BabylonFBO.renderer!.render(effect, this.fbo);
    }

    /* Usage:
    To render to FBO, first create a new FBO

    Then bind to it when you want to render
    Use your created effect as an active shader
    Perform all relevant rendering
    Unbind when done
    */
}

export class PingPongFBO {
    // ----- FBOs -----
    fboA: BabylonFBO;
    fboB: BabylonFBO;
    current: boolean;

    // ----- Constructor -----
    constructor(scene: BABYLON.Scene, dimensions: { width: number, height: number }, canvas: HTMLCanvasElement) {
        this.fboA = new BabylonFBO(scene, dimensions, canvas);
        this.fboB = new BabylonFBO(scene, dimensions, canvas);
        this.current = true;
    }

    // ----- Getters -----
    // FBO to be written to
    getActiveFBO(): BabylonFBO {
        return (this.current ? this.fboA : this.fboB);
    }
    // FBO to be read from
    getInactiveFBO() {
        return (this.current ? this.fboB : this.fboA);
    }
    toggle() {
        this.current = !this.current;
    }
}