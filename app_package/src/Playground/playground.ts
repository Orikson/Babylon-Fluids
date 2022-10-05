import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import { ObjectCollisionMatrix } from "cannon-es";

class Playground {
    scene: BABYLON.Scene;

    constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
        this.scene = new BABYLON.Scene(engine);
        this.CreateScene(engine, canvas);
    }

    async CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
        var objPos = new BABYLON.Vector3(0, 10, 0);

        // This creates and positions a free camera (non-mesh)
        var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), this.scene);
        camera.setTarget(BABYLON.Vector3.Zero());
        camera.attachControl(canvas, true);

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
      
        // here we add XR support
        const xr = await this.scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: "immersive-ar",
            },
        });
    }
}

export function CreatePlayground(engine: BABYLON.Engine, canvas: HTMLCanvasElement): Playground {
    var playground =  new Playground(engine, canvas);
    return playground;
}

export function RenderLoop(playground: Playground) {
    playground.scene.render();
}