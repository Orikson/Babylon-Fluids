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
        var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, -10), this.scene);
        camera.setTarget(BABYLON.Vector3.Zero());
        camera.attachControl(canvas, true);
        
        // xr manager
        this.XRenabled = await BABYLON.WebXRSessionManager.IsSessionSupportedAsync('immersive-ar');
        
        // if XR is enabled for immersive-ar (which only occurs on very specific devices such as the Hololens 2), load immmersive ar experience
        if (this.XRenabled) {
            // here we add XR support
            const xr = await this.scene.createDefaultXRExperienceAsync({
                uiOptions: {
                    sessionMode: "immersive-ar",
//                    optionalFeatures: ["hit-test", "anchors"]
                },
            });
            
            // optional features manager
/*            const fm = xr.baseExperience.featuresManager;
            const hitTest = fm.enableFeature(BABYLON.WebXRHitTest, 'latest') as BABYLON.WebXRHitTest;
            const anchorSystem = fm.enableFeature(BABYLON.WebXRAnchorSystem, "latest") as BABYLON.WebXRAnchorSystem;
            const planeDetector = fm.enableFeature(BABYLON.WebXRPlaneDetector, "latest") as BABYLON.WebXRPlaneDetector;
            const domOverlayFeature = fm.enableFeature(BABYLON.WebXRDomOverlay, "latest", { element: ".dom-overlay-container" }, undefined, false) as BABYLON.WebXRDomOverlay;
            const teleportation = fm.enableFeature(BABYLON.WebXRFeatureName.TELEPORTATION, "stable", {
                xrInput: xr.input,
                floorMeshes: [],
                timeToTeleport: 5000,
                useMainComponentOnly: true,
            });

            xr.baseExperience.onStateChangedObservable.add((webXRState) => {
                switch (webXRState) {
                    case BABYLON.WebXRState.ENTERING_XR:
                    case BABYLON.WebXRState.IN_XR:
                    // domOverlayType will be null when not supported.
                    console.log("overlay type:", domOverlayFeature.domOverlayType);
                    break;
                }
            });

            // on ray hit (with real world geometry)
            hitTest.onHitTestResultObservable.add((results) => { });

            // anchor updates
            anchorSystem.onAnchorAddedObservable.add((anchor) => {
                // ... do what you want with the anchor after it was added
            });
            anchorSystem.onAnchorRemovedObservable.add((anchor) => {
                // ... do what you want with the anchor after it was removed
            });
            anchorSystem.onAnchorUpdatedObservable.add((anchor) => {
                // ... do what you want with the anchor after it was updated
            });

            // plane detector updates
            planeDetector.onPlaneAddedObservable.add((plane) => {
                // ... do what you want with the plane after it was added
            });
            planeDetector.onPlaneRemovedObservable.add((plane) => {
                // ... do what you want with the plane after it was removed
            });
            planeDetector.onPlaneUpdatedObservable.add((plane) => {
                // ... do what you want with the plane after it was updated
            });
*/
        }
        
        var objPos = new BABYLON.Vector3(0, 1, 0);

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
    playground.scene.render();
}