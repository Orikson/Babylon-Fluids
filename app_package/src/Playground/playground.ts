import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import { ObjectCollisionMatrix } from "cannon-es";

class Playground {
    scene: BABYLON.Scene;

    // xr enabled
    XRenabled: boolean;
    sessionManager: BABYLON.WebXRSessionManager;
    
    constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
        this.scene = new BABYLON.Scene(engine);
        this.sessionManager = new BABYLON.WebXRSessionManager(this.scene);
        this.XRenabled = false;
        
        this.CreateScene(engine, canvas);
    }

    async CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
        // xr manager
        this.XRenabled = await BABYLON.WebXRSessionManager.IsSessionSupportedAsync('immersive-ar');
        var camera;
        
        // if XR is enabled for immersive-ar (which only occurs on very specific devices such as the Hololens 2), load immmersive ar experience
        if (this.XRenabled) {
            this.sessionManager.initializeSessionAsync("immersive-ar");
            
            const referenceSpace = this.sessionManager.setReferenceSpaceTypeAsync();
            const renderTarget = this.sessionManager.getWebXRRenderTarget();
            const xrWebGLLayer = renderTarget.initializeXRLayerAsync(this.sessionManager.session);

            // here we add XR support
            const xr = await this.scene.createDefaultXRExperienceAsync({
                uiOptions: {
                    sessionMode: "immersive-ar",
                },
            });

            // This creates and positions a free camera (non-mesh)
            camera = new BABYLON.WebXRCamera("webxrcamera", this.scene, this.sessionManager);
            camera.setTarget(BABYLON.Vector3.Zero());
            camera.attachControl(canvas, true);
        } else {
            camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), this.scene);
            camera.setTarget(BABYLON.Vector3.Zero());
            camera.attachControl(canvas, true);
        }
        
        var objPos = new BABYLON.Vector3(0, 0, 0);

        var lightShader = new BABYLON.ShaderMaterial("shader", this.scene, "./liquids", {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "lightPos"],
        });
        var monoShader = new BABYLON.ShaderMaterial("shader", this.scene, "./white", {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "lightPos"],
        });
        
        var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
        light.intensity = 0.4;

        var tR = 0.25;
        var object = BABYLON.MeshBuilder.CreateTorusKnot("torusKnot", { radius: tR, tube: tR/4, radialSegments: 64, tubularSegments: 5, p: 4 }, this.scene);
        object.position = objPos;
        //object.material = monoShader;

        // setup environment
        //const env = this.scene.createDefaultEnvironment();
    }
}

export function CreatePlayground(engine: BABYLON.Engine, canvas: HTMLCanvasElement): Playground {
    var playground =  new Playground(engine, canvas);
    return playground;
}

export function RenderLoop(playground: Playground) {
    if (playground.XRenabled) {
        playground.sessionManager.runXRRenderLoop();
    } else {
        playground.scene.render();
    }
}