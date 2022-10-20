import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export function setup() {
    BABYLON.Effect.ShadersStore["renderVertexShader"] = `
    
    `;

    BABYLON.Effect.ShadersStore["renderFragmentShader"] = `
    
    `;
}