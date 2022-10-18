// Babylon imports
import * as BABYLON from "@babylonjs/core"
import "@babylonjs/loaders";

// Shader imports
import * as MONO from "./shaders/mono"
import * as BASIC from "./shaders/basicLighting"

/**
 * Uses Babylon's Vector3 class to compute Hadamard product (component wise vector multiplication)
 */
export function hadamard(v1: BABYLON.Vector3, v2: BABYLON.Vector3) {
    return new BABYLON.Vector3(v1.x * v2.x, v1.y * v2.y, v1.z * v2.z);
}

/**
 * Implements Stam's stable fluids algorithm from NVIDIA's GPU Gems 3, Chapter 30
 */
export class StamStableFluids {
    // Babylon run-time objects
    scene: BABYLON.Scene;
    canvas: HTMLCanvasElement;

    // XR/AR objects
    xrEnabled: boolean;
    xrObject: BABYLON.WebXRDefaultExperience;

    // scene objects
    // ----- Shaders -----
    basicShading: BABYLON.ShaderMaterial;           // basic lighting (phong, direct, ambient)
    monoPointLight: BABYLON.ShaderMaterial;         // monochrome coloration for point lights (where all points have equal brightness)

    // ----- Objects -----
    torus: BABYLON.Mesh;                            // torus
    light: BABYLON.Mesh;                            // sperical point light

    // ----- Variables -----
    angle: number = 0;                              // angle of rotation of light around torus
    objPos = new BABYLON.Vector3(0, 1, 0);          // position of torus
    displacement = new BABYLON.Vector3(1, 0.2, 1);  // displacement of light from position of torus

    constructor(scene: BABYLON.Scene, canvas: HTMLCanvasElement) {
        this.scene = scene;
        this.canvas = canvas;

        this.load_shaderObjects();
        this.load_sceneObjects();
    }

    update() {
        this.angle += this.scene.getEngine().getDeltaTime()/5000;
        var displacement = hadamard(this.displacement, new BABYLON.Vector3(Math.sin(this.angle), 1, Math.cos(this.angle)));
        
        displacement = displacement.add(this.objPos);
        this.basicShading.setVector3("lightPos", displacement);
        this.light.position = displacement;
    }

    load_sceneObjects() {
        var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, -10), this.scene);
        camera.setTarget(BABYLON.Vector3.Zero());
        camera.attachControl(this.canvas, true);
        
        this.basicShading.setVector3("lightPos", this.objPos.add(this.displacement));

        var tR = 0.25;
        this.torus = BABYLON.MeshBuilder.CreateTorusKnot("torus", { radius: tR, tube: tR/4, radialSegments: 64, tubularSegments: 5, p: 4 }, this.scene);
        this.torus.position = this.objPos;
        this.torus.material = this.basicShading;

        this.light = BABYLON.MeshBuilder.CreateSphere("light", { diameter: tR/3 }, this.scene);
        this.light.position = this.objPos.add(this.displacement);
        this.light.material = this.monoPointLight;
    }

    load_shaderObjects() {
        MONO.setup();
        BASIC.setup();

        this.basicShading = new BABYLON.ShaderMaterial("shader", this.scene, {
            vertexElement: "basicLighting",
            fragmentElement: "basicLighting"
        }, {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "lightPos"],
        });
        this.monoPointLight = new BABYLON.ShaderMaterial("shader", this.scene, {
            vertexElement: "mono",
            fragmentElement: "mono"
        }, {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "lightPos"],
        });
    }
}