import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export function setup() {
    BABYLON.Effect.ShadersStore["sampleVertexShader"] = `
    #include<stam3D_vertex>
    `;
    BABYLON.Effect.ShadersStore["sampleFragmentShader"] = `
    #include<stam3D_header>
    
    void main(void) {
        //gl_FragColor = vec4(convertUVP(getUV3D(vuv, bbResolution), bbPosition, bbWorldSize, bbQuaternion), 1.);
        //gl_FragColor = vec4(vuv, 0., 1.);
        
        // compute things in pixel coordinates cuz thats way easier
        
        float absXCoord = floor(bbResolution.x * bbResolution.z * vuv.x);
        float absYCoord = floor(bbResolution.y * vuv.y);
        float temp = absXCoord / bbResolution.x;
        float x = floor(fract(temp) * bbResolution.x) / bbResolution.x;
        float y = absYCoord / bbResolution.y;
        float z = floor(temp) / bbResolution.z;
        
        if (y < 0.25 + 0.05 * cos(25.*x) * sin(25.*z) + 0.1 * cos(17.*x) * sin(17.*z)) {
            gl_FragColor = vec4(x, y, z, 0.);
        } else {
            gl_FragColor = vec4(x, y, z, -1.);
        }
    }
    `;
}