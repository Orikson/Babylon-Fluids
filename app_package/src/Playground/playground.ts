import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import { ObjectCollisionMatrix } from "cannon-es";
import * as WHITE from "./shaders/white";
import * as LIQUID from "./shaders/liquids";
import { float, Vector3 } from "@babylonjs/core";

class Playground {
    scene: BABYLON.Scene;
    engine: BABYLON.Engine;

    // xr enabled
    XRenabled: boolean;
    sessionManager: BABYLON.WebXRSessionManager;

    // scene contents
    angle: float;
    lightShader: BABYLON.ShaderMaterial;
    monoShader: BABYLON.ShaderMaterial;
    lightSource: BABYLON.Mesh;
    objPos: BABYLON.Vector3;
    
    constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
        LIQUID.setup();
        WHITE.setup();

        this.scene = new BABYLON.Scene(engine);
        this.engine = engine;
        this.sessionManager = new BABYLON.WebXRSessionManager(this.scene);
        this.XRenabled = false;

        this.angle = 0;
        this.lightShader = new BABYLON.ShaderMaterial("shader", this.scene, {
            vertexElement: "liquids",
            fragmentElement: "liquids"
        }, {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "lightPos"],
        });
        this.monoShader = new BABYLON.ShaderMaterial("shader", this.scene, {
            vertexElement: "white",
            fragmentElement: "white"
        }, {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "lightPos"],
        });

        this.lightSource = BABYLON.MeshBuilder.CreateSphere("sphere1", { diameter: 0.25 }, this.scene);

        this.objPos = new BABYLON.Vector3(0, 1, 0);
        
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
                    optionalFeatures: ["hit-test", "anchors"]
                },
            });
            
            // optional features manager
            const fm = xr.baseExperience.featuresManager;
            const hitTest = fm.enableFeature(BABYLON.WebXRHitTest, 'latest') as BABYLON.WebXRHitTest;
            const anchorSystem = fm.enableFeature(BABYLON.WebXRAnchorSystem, "latest") as BABYLON.WebXRAnchorSystem;
            const planeDetector = fm.enableFeature(BABYLON.WebXRPlaneDetector, "latest") as BABYLON.WebXRPlaneDetector;
/*            const domOverlayFeature = fm.enableFeature(BABYLON.WebXRDomOverlay, "latest", { element: ".dom-overlay-container" }, undefined, false) as BABYLON.WebXRDomOverlay;
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
*/
            // on ray hit (with real world geometry)
            // a dot to show in the found position
            const dot = BABYLON.MeshBuilder.CreateSphere(
                "dot",
                {
                    diameter: 0.01,
                },
                this.scene,
            );
            dot.isVisible = false;
            hitTest.onHitTestResultObservable.add((results) => {
                if (results.length) {
                    dot.isVisible = true;
                    results[0].transformationMatrix.decompose(dot.scaling, dot.rotationQuaternion as BABYLON.Quaternion, dot.position);
                } else {
                    dot.isVisible = false;
                }
            });

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
/*
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

        this.lightShader.setVector3("lightPos", new Vector3(5, 1, 5));

        var tR = 0.25;
        var object = BABYLON.MeshBuilder.CreateTorusKnot("torusKnot", { radius: tR, tube: tR/4, radialSegments: 64, tubularSegments: 5, p: 4 }, this.scene);
        object.position = this.objPos;
        object.material = this.lightShader;

        var displacement = new Vector3(1, 0.2, 1);
        this.lightSource.position = this.objPos.add(displacement);
        this.lightSource.material = this.monoShader;
    }

    update() {
        this.angle += this.engine.getDeltaTime()/5000;
        var displacement = new Vector3(1*Math.sin(this.angle), 0.2, 1*Math.cos(this.angle));
        displacement = displacement.add(this.objPos);
        this.lightShader.setVector3("lightPos", displacement);
        this.lightSource.position = displacement;
    }
}

export function CreatePlayground(engine: BABYLON.Engine, canvas: HTMLCanvasElement): Playground {
    var playground =  new Playground(engine, canvas);
    return playground;
}

export function RenderLoop(playground: Playground) {
    playground.scene.render();
    playground.update();
}