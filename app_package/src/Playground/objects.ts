import * as BABYLON from "@babylonjs/core"
import "@babylonjs/loaders";
import * as MODULES from "./modules";

// Manages all current scene objects and related shaders, and is responsible for adding all objects to the run-time scene object
// also manages scene related XR/AR features
export class SceneObjects {
    // Babylon run-time objects
    scene: BABYLON.Scene;
    canvas: HTMLCanvasElement;

    // XR/AR objects
    xrEnabled: boolean;
    xrObject: BABYLON.WebXRDefaultExperience;

    // scene objects
    stam: MODULES.StamStableFluids;

    constructor(scene: BABYLON.Scene, canvas: HTMLCanvasElement, xr?: BABYLON.WebXRDefaultExperience) {
        this.scene = scene;
        this.canvas = canvas;
        
        this.xrEnabled = xr != undefined;
        if (xr != undefined) {
            this.xrObject = xr;
            this.load_xrFeatures();
        }

        this.load_sceneObjects();
    }

    update() {
        this.stam.update();
    }

    load_sceneObjects() {
        this.stam = new MODULES.StamStableFluids(this.scene, this.canvas, this.xrObject);
    }

    load_xrFeatures() {
        const fm = this.xrObject.baseExperience.featuresManager;
        const hitTest = fm.enableFeature(BABYLON.WebXRHitTest, 'latest') as BABYLON.WebXRHitTest;
        const anchorSystem = fm.enableFeature(BABYLON.WebXRAnchorSystem, "latest") as BABYLON.WebXRAnchorSystem;
        // plane detector appears to cause problems on the Hololens 2; this is something to look into
        //const planeDetector = fm.enableFeature(BABYLON.WebXRPlaneDetector, "latest") as BABYLON.WebXRPlaneDetector;

        // setup hit test
        // renders a small sphere at real-world position directly in front of user when applicable
        const dot = BABYLON.MeshBuilder.CreateSphere("dot", { diameter: 0.01, }, this.scene);
        dot.isVisible = false;
        
        hitTest.onHitTestResultObservable.add((results) => {
            if (results.length) {
                dot.isVisible = true;
                results[0].transformationMatrix.decompose(dot.scaling, dot.rotationQuaternion as BABYLON.Quaternion, dot.position);
            } else {
                dot.isVisible = false;
            }
        });

        // setup anchor test
        anchorSystem.onAnchorAddedObservable.add((anchor) => {
            // ... do what you want with the anchor after it was added
        });
        anchorSystem.onAnchorRemovedObservable.add((anchor) => {
            // ... do what you want with the anchor after it was removed
        });
        anchorSystem.onAnchorUpdatedObservable.add((anchor) => {
            // ... do what you want with the anchor after it was updated
        });

        /*
        // setup plane detector test
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
}
