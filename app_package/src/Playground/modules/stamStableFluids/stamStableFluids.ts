// Babylon imports
import * as BABYLON from "@babylonjs/core"
import "@babylonjs/loaders";

// Shader imports
import * as RENDER from "./shaders/render"
import * as STAM2D_FUNCS from "./shaders/2D/funcs"
import * as STAM2D_HEADERS from "./shaders/2D/headers"
import * as STAM2D_MATH from "./shaders/2D/math"
import * as STAM2D_STEPS from "./shaders/2D/steps"
import * as EXAMPLE from "./shaders/example"

// Util
import * as UTIL from "../../utility/util"
import * as FBO from "../../utility/fbo"

/**
 * Uses Babylon's Vector3 class to compute Hadamard product (component wise vector multiplication)
 */
export function hadamard(v1: BABYLON.Vector3, v2: BABYLON.Vector3) {
    return new BABYLON.Vector3(v1.x * v2.x, v1.y * v2.y, v1.z * v2.z);
}

/**
 * Implements Stam's stable fluids algorithm from NVIDIA's GPU Gems 1, Chapter 35
 * https://www.cs.cmu.edu/~kmcrane/Projects/GPUFluid/paper.pdf
 * Most interesting computation occurs in relevant shaders; this class merely manages the processing of this pipeline (such as the order of shaders, storage of textures, etc.)
 */
export class OldStamStableFluids2D {
    // Babylon run-time objects
    scene: BABYLON.Scene;
    canvas: HTMLCanvasElement;

    // XR/AR objects
    xrEnabled: boolean;
    xrObject: BABYLON.WebXRDefaultExperience;

    // scene objects
    // ----- Shaders/Textures -----
    finalTex: UTIL.PlaneFBO;
    velTex: UTIL.PingPongPlaneFBO;
    tmpTex: UTIL.PlaneFBO;
    qntTex: UTIL.PingPongPlaneFBO;
    prsTex: UTIL.PingPongPlaneFBO;

    // ----- Step shader access -----
    advStep: number;
    frcStep: number;
    difStep: number;
    divStep: number;
    prsStep: number;
    grdStep: number;

    // ----- Objects -----
    renderPlane: BABYLON.Mesh;
    
    // ----- Cameras -----
    cameraXR: BABYLON.WebXRCamera;
    cameraFR: BABYLON.FreeCamera;

    // ----- Variables -----
    runTime: number;
    dt: number;
    frame: number;
    resolution: BABYLON.Vector2;
    mpos: BABYLON.Vector2;
    relM: BABYLON.Vector2;
    mDown: number;
    
    /**
     * Constructs a new Stam Stable Fluids object
     * @param scene 
     * @param canvas 
     * @param xr 
     */
    constructor(scene: BABYLON.Scene, canvas: HTMLCanvasElement, xr?: BABYLON.WebXRDefaultExperience) {
        this.scene = scene;
        this.canvas = canvas;

        this.xrEnabled = xr != undefined;
        if (xr != undefined) {
            this.xrObject = xr;
        }

        this.runTime = 0;
        this.dt = 0;
        this.frame = 0;
        this.resolution = new BABYLON.Vector2(128, 128);
        this.mpos = new BABYLON.Vector2(0, 0);
        this.relM = new BABYLON.Vector2(0, 0);
        this.mDown = 1;

        this.load_shaderObjects();
        this.load_sceneObjects();
    }

    // ----- Computation kernels -----
    // assumes active shader has already been set
    updateFBO(fbo: UTIL.PlaneFBO) {
        fbo.setFloat("frame", this.frame);
        fbo.setFloat("dt", this.dt);
        fbo.setVec2("res", this.resolution);
        fbo.setVec2("mpos", this.mpos);
        fbo.setVec2("rel", this.relM);
        fbo.setFloat("mDown", this.mDown);

        fbo.setTexture("velTex", this.velTex.getInactiveTex());
        if (fbo == this.tmpTex) {
            fbo.setTexture("tmpTex", this.tmpTex.texture);
        }
        fbo.setTexture("prsTex", this.prsTex.getInactiveTex());
        fbo.setTexture("qntTex", this.qntTex.getInactiveTex());
    }
    updatePingPongFBO(fbo: UTIL.PingPongPlaneFBO) {
        fbo.setFloat("frame", this.frame);
        fbo.setFloat("dt", this.dt);
        fbo.setVec2("res", this.resolution);
        fbo.setVec2("mpos", this.mpos);
        fbo.setVec2("rel", this.relM);
        fbo.setFloat("mDown", this.mDown);

        fbo.setTexture("velTex", this.velTex.getInactiveTex());
        fbo.setTexture("tmpTex", this.tmpTex.texture);
        fbo.setTexture("prsTex", this.prsTex.getInactiveTex());
        fbo.setTexture("qntTex", this.qntTex.getInactiveTex());
    }

    step_advection() {
        this.qntTex.setActiveShader(this.advStep);
        this.updatePingPongFBO(this.qntTex);
        this.qntTex.render();
    }

    step_force() {
        this.velTex.setActiveShader(this.frcStep);
        this.updatePingPongFBO(this.velTex);
        this.velTex.render();
    }

    step_diffusion() {
        for (let i = 0; i < 20; i ++) {
            this.velTex.setActiveShader(this.difStep);
            this.updatePingPongFBO(this.velTex);
            this.velTex.render();
        }
    }

    step_divergence() {
        this.tmpTex.setActiveShader(this.divStep);
        this.updateFBO(this.tmpTex);
        this.tmpTex.render();
    }

    step_pressure() {
        for (let i = 0; i < 40; i ++) {
            this.prsTex.setActiveShader(this.prsStep);
            this.updatePingPongFBO(this.prsTex);
            this.prsTex.render();
        }
    }

    step_gradient() {
        this.velTex.setActiveShader(this.grdStep);
        this.updatePingPongFBO(this.velTex);
        this.velTex.render();
    }

    /**
     * Updates all objects and all textures, and performs all auxiliary scene renders
     */
    update() {
        this.frame += 1;
        this.dt = 0.01;//this.scene.getEngine().getDeltaTime() / 1000;
        this.runTime += this.dt;

        let radius = 32;
        let npos = new BABYLON.Vector2(this.resolution.x/2 + radius * Math.cos(this.runTime * 5), this.resolution.y/2 + radius * Math.sin(this.runTime * 5) * Math.cos(this.runTime * 5));
        this.relM = npos.subtract(this.mpos);
        this.mpos = npos;
        //let float = BABYLON.Constants.TEXTUREFORMAT_rgba
        //this.mpos = new BABYLON.Vector2(64, 64);
        //this.relM = new BABYLON.Vector2(Math.cos(this.runTime * 2), -1);

        this.step_advection();
        this.step_force();
        this.step_diffusion();
        this.step_divergence();
        this.step_pressure();
        this.step_gradient();

        this.finalTex.setActiveShader(0);
        this.updateFBO(this.finalTex);
        this.finalTex.render();
    }

    load_sceneObjects() {
        if (this.xrObject != undefined) {
            this.cameraXR = new BABYLON.WebXRCamera("camera 1", this.scene, this.xrObject.baseExperience.sessionManager);
            this.cameraXR.attachControl(this.canvas, true);
        } else {
            this.cameraFR = new BABYLON.FreeCamera("camera 1", new BABYLON.Vector3(0, 0, -7), this.scene);
            this.cameraFR.setTarget(BABYLON.Vector3.Zero());
            this.cameraFR.attachControl(this.canvas, true);
        }
        
        this.renderPlane = BABYLON.MeshBuilder.CreatePlane("render plane", { width: 5, height: 5 }, this.scene);
        this.renderPlane.material = this.finalTex.genEmissiveMat("final");
    }

    load_shaderObjects() {
        RENDER.setup2D();

        // the order is important for in-shader import order
        STAM2D_HEADERS.setup();
        STAM2D_FUNCS.setup();
        STAM2D_MATH.setup();
        STAM2D_STEPS.setup();

        // resolution of 2D fluid
        let dimensions = { width: 256, height: 256 };

        // setup kernels
        this.velTex = new UTIL.PingPongPlaneFBO("velTex", dimensions, this.scene);
        this.tmpTex = new UTIL.PlaneFBO("tmpTex", dimensions, this.scene);
        this.qntTex = new UTIL.PingPongPlaneFBO("qntTex", dimensions, this.scene);
        this.prsTex = new UTIL.PingPongPlaneFBO("prsTex", dimensions, this.scene);
        
        // setup shader paths
        let advStep_path = { vertex: "stam2D_advectionStep",  fragment: "stam2D_advectionStep" };
        let frcStep_path = { vertex: "stam2D_forceStep",      fragment: "stam2D_forceStep" };
        let difStep_path = { vertex: "stam2D_diffusionStep",  fragment: "stam2D_diffusionStep" };
        let divStep_path = { vertex: "stam2D_divergenceStep", fragment: "stam2D_divergenceStep" };
        let prsStep_path = { vertex: "stam2D_pressureStep",   fragment: "stam2D_pressureStep" };
        let grdStep_path = { vertex: "stam2D_gradientStep",   fragment: "stam2D_gradientStep" };
        let final_path =   { vertex: "stam2D_finalStep",      fragment: "stam2D_finalStep" };

        // setup shader options
        let standardAttributes = ["position", "normal", "uv"];
        let standardUniforms = [
            "world", "worldView", "worldViewProjection", "view", "projection", 
            "frame", "dt", "res", "mpos", "rel", "mDown", 
            "velTex", "tmpTex", "prsTex", "qntTex"
        ];

        let advStep_options = { attributes: standardAttributes, uniforms: standardUniforms };
        let frcStep_options = { attributes: standardAttributes, uniforms: standardUniforms };
        let difStep_options = { attributes: standardAttributes, uniforms: standardUniforms };
        let divStep_options = { attributes: standardAttributes, uniforms: standardUniforms };
        let prsStep_options = { attributes: standardAttributes, uniforms: standardUniforms };
        let grdStep_options = { attributes: standardAttributes, uniforms: standardUniforms };
        let final_options =   { attributes: standardAttributes, uniforms: standardUniforms };
        
        // final kernel setup
        /* FBO write table
        where nxt -> active tex <- always written to
        where cur -> inactive tex <- always read from

        STEP            WRITE       DONE
        advection       nxtQnt      x
        force           nxtVel      x
        diffusion       nxtVel      x
        divergence      tmp         x
        pressure        nxtPrs      x
        gradient        nxtVel      x
        final           final
        */
        this.frcStep = this.velTex.addShader(frcStep_path, frcStep_options);
        this.difStep = this.velTex.addShader(difStep_path, difStep_options);
        this.grdStep = this.velTex.addShader(grdStep_path, grdStep_options);
        this.divStep = this.tmpTex.addShader(divStep_path, divStep_options);
        this.advStep = this.qntTex.addShader(advStep_path, advStep_options);
        this.prsStep = this.prsTex.addShader(prsStep_path, prsStep_options);
        
        // final kernel
        this.finalTex = new UTIL.PlaneFBO("final", dimensions, this.scene);
        this.finalTex.addShader(final_path, final_options);
    }
}

export class StamStableFluids2D {
    // ----- BABYLON -----
    scene: BABYLON.Scene;
    engine: BABYLON.Engine;
    canvas: HTMLCanvasElement;

    // ----- XR Enabled -----
    xrEnabled: boolean;
    xrObject: BABYLON.WebXRDefaultExperience;

    // ----- FBOs -----
    velFBO: FBO.PingPongFBO;
    tmpFBO: FBO.BabylonFBO;
    qntFBO: FBO.PingPongFBO;
    prsFBO: FBO.PingPongFBO;
    finalFBO: FBO.BabylonFBO;

    // ----- Shaders -----
    advStep: BABYLON.EffectWrapper;
    frcStep: BABYLON.EffectWrapper;
    difStep: BABYLON.EffectWrapper;
    divStep: BABYLON.EffectWrapper;
    prsStep: BABYLON.EffectWrapper;
    grdStep: BABYLON.EffectWrapper;
    finalStep: BABYLON.EffectWrapper;
    
    // ----- Cameras -----
    cameraXR: BABYLON.WebXRCamera;
    cameraFR: BABYLON.FreeCamera;

    // ----- Objects ------
    renderPlane: BABYLON.Mesh;
    mat: BABYLON.StandardMaterial;

    // ----- Variables -----
    runTime: number;
    dt: number;
    frame: number;
    resolution: BABYLON.Vector2;
    mpos: BABYLON.Vector2;
    relM: BABYLON.Vector2;
    mDown: number;

    // ----- Constructor -----
    constructor(scene: BABYLON.Scene, canvas: HTMLCanvasElement, xr?: BABYLON.WebXRDefaultExperience) {
        this.scene = scene;
        this.engine = scene.getEngine();
        this.canvas = canvas;

        this.xrEnabled = xr != undefined;
        if (xr != undefined) {
            this.xrObject = xr;
        }
        
        this.runTime = 0;
        this.dt = 0;
        this.frame = 0;
        this.resolution = new BABYLON.Vector2(256, 256);
        this.mpos = new BABYLON.Vector2(64, 64);
        this.relM = new BABYLON.Vector2(0, 0);
        this.mDown = 1;

        this.load_shaders();
        this.load_objects();
    }

    // ----- Intermediate Render Functions -----
    updateShader(effect: BABYLON.EffectWrapper) {
        // "frame", "dt", "res", "mpos", "rel", "mDown"
        // "velTex", "tmpTex", "prsTex", "qntTex"
        this.engine.enableEffect(effect._drawWrapper);
        effect.effect.setFloat("frame", this.frame);
        effect.effect.setFloat("dt", this.dt);
        effect.effect.setFloat2("res", this.resolution.x, this.resolution.y);
        effect.effect.setFloat2("mpos", this.mpos.x, this.mpos.y);
        effect.effect.setFloat2("rel", this.relM.x, this.relM.y);
        effect.effect.setFloat("mDown", this.mDown);
        
        effect.effect.setTexture("velTex", new BABYLON.ThinTexture(this.velFBO.getInactiveFBO().fbo.texture));
        effect.effect.setTexture("tmpTex", new BABYLON.ThinTexture(this.tmpFBO.fbo.texture));
        effect.effect.setTexture("prsTex", new BABYLON.ThinTexture(this.prsFBO.getInactiveFBO().fbo.texture));
        effect.effect.setTexture("qntTex", new BABYLON.ThinTexture(this.qntFBO.getInactiveFBO().fbo.texture));
        this.engine.enableEffect(null);
    }
    renderLoneFBO(fbo: FBO.BabylonFBO, effect: BABYLON.EffectWrapper) {
        //fbo.rbind(effect);
        fbo.render(effect);
    }
    renderDoubleFBO(fbo: FBO.PingPongFBO, effect: BABYLON.EffectWrapper) {
        //fbo.getActiveFBO().rbind(effect);
        fbo.getActiveFBO().render(effect);
        fbo.toggle();
    }

    // ----- Update -----
    update() {
        this.dt = this.engine.getDeltaTime() / 1000;
        this.runTime += this.dt;
        this.frame += 1;

        let radius = this.resolution.x/4;
        let npos = new BABYLON.Vector2(this.resolution.x/2 + radius * Math.cos(this.runTime * 5), this.resolution.y/2 + radius * Math.sin(this.runTime * 5) * Math.cos(this.runTime * 3));
        this.relM = npos.subtract(this.mpos);
        this.mpos = npos;
        
        if (this.engine.areAllEffectsReady()) {
            // advection step
            this.updateShader(this.advStep);
            this.renderDoubleFBO(this.qntFBO, this.advStep);

            // force step
            this.updateShader(this.frcStep);
            this.renderDoubleFBO(this.velFBO, this.frcStep);

            // diffusion step
            for (let i = 0; i < 20; i ++) {
                this.updateShader(this.difStep);
                this.renderDoubleFBO(this.velFBO, this.difStep);
            }

            // divergence step
            this.updateShader(this.divStep);
            this.renderLoneFBO(this.tmpFBO, this.divStep);
            
            // pressure step
            for (let i = 0; i < 40; i ++) {
                this.updateShader(this.prsStep);
                this.renderDoubleFBO(this.prsFBO, this.prsStep);
            }

            // gradient step
            this.updateShader(this.grdStep);
            this.renderDoubleFBO(this.velFBO, this.grdStep);

            // final step
            this.updateShader(this.finalStep);
            this.renderLoneFBO(this.finalFBO, this.finalStep);
        }
    }

    // ----- Load Scene Objects -----
    load_objects() {
        if (this.xrObject != undefined) {
            this.cameraXR = new BABYLON.WebXRCamera("camera 1", this.scene, this.xrObject.baseExperience.sessionManager);
            this.cameraXR.attachControl(this.canvas, true);
        } else {
            this.cameraFR = new BABYLON.FreeCamera("camera 1", new BABYLON.Vector3(0, 0, -7), this.scene);
            this.cameraFR.setTarget(BABYLON.Vector3.Zero());
            this.cameraFR.attachControl(this.canvas, true);
        }

        this.renderPlane = BABYLON.MeshBuilder.CreatePlane("render plane", { width: 5, height: 5 }, this.scene);
        
        this.mat = new BABYLON.StandardMaterial("mat", this.scene);
		this.mat.emissiveTexture = new BABYLON.BaseTexture(this.engine, this.finalFBO.fbo.texture);
        this.mat.emissiveTexture.updateSamplingMode(3);
        this.mat.disableLighting = true;

        this.renderPlane.material = this.mat;
    }

    // ----- Load Shaders -----
    load_shaders() {
        // the order is important for in-shader import order
        STAM2D_HEADERS.setup();
        STAM2D_FUNCS.setup();
        STAM2D_MATH.setup();
        STAM2D_STEPS.setup();

        // setup kernels
        const dimensions = { width: this.resolution.x, height: this.resolution.y };

        this.velFBO = new FBO.PingPongFBO(this.scene, dimensions, this.canvas);
        this.tmpFBO = new FBO.BabylonFBO(this.scene, dimensions, this.canvas);
        this.qntFBO = new FBO.PingPongFBO(this.scene, dimensions, this.canvas);
        this.prsFBO = new FBO.PingPongFBO(this.scene, dimensions, this.canvas);
        
        // setup shader paths
        let advStep_path = { vertex: "stam2D_advectionStep",  fragment: "stam2D_advectionStep" };
        let frcStep_path = { vertex: "stam2D_forceStep",      fragment: "stam2D_forceStep" };
        let difStep_path = { vertex: "stam2D_diffusionStep",  fragment: "stam2D_diffusionStep" };
        let divStep_path = { vertex: "stam2D_divergenceStep", fragment: "stam2D_divergenceStep" };
        let prsStep_path = { vertex: "stam2D_pressureStep",   fragment: "stam2D_pressureStep" };
        let grdStep_path = { vertex: "stam2D_gradientStep",   fragment: "stam2D_gradientStep" };
        let final_path =   { vertex: "stam2D_finalStep",      fragment: "stam2D_finalStep" };

        // setup shader options
        let standardAttributes = ["position", "normal", "uv"];
        let standardUniforms = [
            "world", "worldView", "worldViewProjection", "view", "projection", 
            "frame", "dt", "res", "mpos", "rel", "mDown", 
        ];
        let standardSamplers = ["velTex", "tmpTex", "prsTex", "qntTex"];

        let advStep_options = { attributes: standardAttributes, uniforms: standardUniforms, samplers: standardSamplers };
        let frcStep_options = { attributes: standardAttributes, uniforms: standardUniforms, samplers: standardSamplers };
        let difStep_options = { attributes: standardAttributes, uniforms: standardUniforms, samplers: standardSamplers };
        let divStep_options = { attributes: standardAttributes, uniforms: standardUniforms, samplers: standardSamplers };
        let prsStep_options = { attributes: standardAttributes, uniforms: standardUniforms, samplers: standardSamplers };
        let grdStep_options = { attributes: standardAttributes, uniforms: standardUniforms, samplers: standardSamplers };
        let final_options =   { attributes: standardAttributes, uniforms: standardUniforms, samplers: standardSamplers };
        
        // setup shaders
        this.frcStep = FBO.createEffect(this.engine, frcStep_path, frcStep_options);
        this.difStep = FBO.createEffect(this.engine, difStep_path, difStep_options);
        this.grdStep = FBO.createEffect(this.engine, grdStep_path, grdStep_options);
        this.divStep = FBO.createEffect(this.engine, divStep_path, divStep_options);
        this.advStep = FBO.createEffect(this.engine, advStep_path, advStep_options);
        this.prsStep = FBO.createEffect(this.engine, prsStep_path, prsStep_options);
        
        // final kernel
        this.finalFBO = new FBO.BabylonFBO(this.scene, dimensions, this.canvas);
        this.finalStep = FBO.createEffect(this.engine, final_path, final_options);
    }
}


/**
 * Implements Stam's stable fluids algorithm from NVIDIA's GPU Gems 3, Chapter 30
 * https://www.cs.cmu.edu/~kmcrane/Projects/GPUFluid/paper.pdf
 * Most interesting computation occurs in relevant shaders; this class merely manages the processing of this pipeline (such as the order of shaders, storage of textures, etc.)
 */
export class StamStableFluids3D {

}