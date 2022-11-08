import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import * as OBJECTS from "./objects";

// Manages babylon run-time objects, but entrusts scene objects to OBJECTS.SceneObjects
// Constructs AR environment/session manager/etc. Functions for render/update step in exported render loop.
class Playground {
    // Babylon run-time objects
    scene: BABYLON.Scene;
    engine: BABYLON.Engine;
    canvas: HTMLCanvasElement;

    // XR/AR objects
    xrEnabled: boolean;
    sessionManager: BABYLON.WebXRSessionManager;
    xrObject: BABYLON.WebXRDefaultExperience;
    xrReferenceSpace: XRReferenceSpace;
    
    // scene ready
    ready: boolean;

    // scene objects
    objects: OBJECTS.SceneObjects;

    constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
        this.scene = new BABYLON.Scene(engine);
        this.engine = engine;
        this.canvas = canvas;

        this.sessionManager = new BABYLON.WebXRSessionManager(this.scene);
        this.xrEnabled = false;
        
        this.ready = false;
        this.load_scene();
    }

    render() {
        if (this.ready) {
            this.scene.render();
        }
    }

    update() {
        if (this.ready) {
            this.objects.update();
        }
    }

    async load_scene() {
        this.xrEnabled = await BABYLON.WebXRSessionManager.IsSessionSupportedAsync('immersive-ar');
        if (this.xrEnabled) {
            this.xrObject = await this.scene.createDefaultXRExperienceAsync({
                uiOptions: {
                    sessionMode: "immersive-ar",
                    referenceSpaceType: "unbounded",
                    //optionalFeatures: ["hit-test", "anchors"]
                },
            });
        }
        this.objects = new OBJECTS.SceneObjects(this.scene, this.canvas, (this.xrEnabled ? this.xrObject : undefined));
        this.ready = true;
    }
}

export function CreatePlayground(engine: BABYLON.Engine, canvas: HTMLCanvasElement): Playground {
    var playground =  new Playground(engine, canvas);
    return playground;
}

export function RenderLoop(playground: Playground) {
    playground.update();
    playground.render();
}