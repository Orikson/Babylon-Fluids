// Babylon imports
import * as BABYLON from "@babylonjs/core"
import "@babylonjs/loaders";

// Shader imports
import * as RENDER from "./shaders/render"
import * as STAM2D_FUNCS from "./shaders/2D/funcs"
import * as STAM2D_HEADERS from "./shaders/2D/headers"
import * as STAM2D_MATH from "./shaders/2D/math"
import * as STAM2D_STEPS from "./shaders/2D/steps"

// Util
import * as UTIL from "../../utility/util"

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
export class StamStableFluids2D {
    // Babylon run-time objects
    scene: BABYLON.Scene;
    canvas: HTMLCanvasElement;

    // XR/AR objects
    xrEnabled: boolean;
    xrObject: BABYLON.WebXRDefaultExperience;

    // scene objects
    // ----- Shaders/Textures -----
    finalTex: UTIL.PlaneKernel;
    velTex: UTIL.PingPongPlaneKernel;
    tmpTex: UTIL.PlaneKernel;
    qntTex: UTIL.PingPongPlaneKernel;
    prsTex: UTIL.PingPongPlaneKernel;

    // ----- Objects -----
    renderPlane: BABYLON.Mesh;
    
    // ----- Cameras -----
    cameraXR: BABYLON.WebXRCamera;
    cameraFR: BABYLON.FreeCamera;

    // ----- Variables -----
    runTime: number;
    
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

        this.load_shaderObjects();
        this.load_sceneObjects();

        this.runTime = 0;
    }

    // ----- Computation kernels -----
    step_advection() {
        
    }

    step_external() {

    }

    step_pressure() {

    }

    /**
     * Updates all objects and all textures, and performs all auxiliary scene renders
     */
    update() {
        //this.exampleShader.setFloat("time", this.runTime);
        //this.exampleKernel.render();


        
        this.runTime += this.scene.getEngine().getDeltaTime();
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

        // setup kernels
        // each kernel should have a write texture and a set of read textures
        // each render call should render to the write texture
    }
}


/**
 * Implements Stam's stable fluids algorithm from NVIDIA's GPU Gems 3, Chapter 30
 * https://www.cs.cmu.edu/~kmcrane/Projects/GPUFluid/paper.pdf
 * Most interesting computation occurs in relevant shaders; this class merely manages the processing of this pipeline (such as the order of shaders, storage of textures, etc.)
 */
export class StamStableFluids3D {

}