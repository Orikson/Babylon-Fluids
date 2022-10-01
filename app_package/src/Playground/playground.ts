import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

class Playground {
    scene: BABYLON.Scene;

    constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
        this.scene = new BABYLON.Scene(engine);
        this.CreateScene(engine, canvas);
    }

    async CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
        // This creates and positions a free camera (non-mesh)
        var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), this.scene);

        // This targets the camera to scene origin
        camera.setTarget(BABYLON.Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        var object = BABYLON.MeshBuilder.CreateTorusKnot("torusKnot", { radialSegments: 64, tubularSegments: 5, p: 2 }, this.scene);

        // setup environment
        const env = this.scene.createDefaultEnvironment();
      
        // here we add XR support
        const xr = await this.scene.createDefaultXRExperienceAsync({});
    }
}

export function CreatePlaygroundScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
    var playground =  new Playground(engine, canvas);
    return playground.scene;
}
