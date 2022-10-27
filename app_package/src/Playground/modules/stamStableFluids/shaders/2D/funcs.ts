import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export function setup() {
    BABYLON.Effect.IncludesShadersStore["stam2D_advectionFuncs"] = `
    /*
    From the text; 

    q(x, t+del t) = q(x - u(x, t) del t, t)

    where 
        x is our position,
        t is time,
        del t is change in time, 
        u(x, t) is velocity at position x at time t

    q is our quantity function
    */

    // uses global variables 
    //  velocity field u -> velTex
    //  quantity field x -> qntTex
    //  delta t (timestep) -> dt
    //  resolution of texture -> res
    void advect(vec2 coords, out vec4 xNew) {
        vec2 pos = coords - dt * (res.x / res.y) * texture(velTex, coords).xy;
        vec4 xL = texture(qntTex, pos - vec2(delx, 0));
        vec4 xR = texture(qntTex, pos + vec2(delx, 0));
        vec4 xB = texture(qntTex, pos - vec2(0, dely));
        vec4 xT = texture(qntTex, pos + vec2(0, dely));
        
        xNew = mix(mix(xL, xR, 0.5), mix(xB, xT, 0.5), 0.5);
    }
    `;

    BABYLON.Effect.IncludesShadersStore["stam2D_diffusionFuncs"] = `
    /*
    From the text;

    (I - (v)(del t)(Laplacian)) u(x, t + del t) = u (x, t)

    Solved using Jacobi iterations
    */

    void diffusion(vec2 coords, out vec4 xNew) {
        // must iterate outside of the shader ~20 times for accuracy
        float alpha = delx * delx / (VISCOSITY * dt);
        float rbeta = 1 / (4 + alpha);
        jacobi(coords, xNew, alpha, rbeta, velTex, velTex);
    }
    `;

    BABYLON.Effect.IncludesShadersStore["stam2D_forceFuncs"] = `
    void applyForce(vec2 coords, out vec4 force, float r) {
        vec2 orgPos = mpos / res; // original mouse position rescaled
        vec2 relMmt = rel / res; // relative mouse motion rescaled
    
        vec2 F = relMmt * FORCEMULT;
    
        force = vec4(F*1/distance(coords, orgPos), 0, 0);
        //force = vec4(F*exp(pow(distance(coords, orgPos),2) / r) * dt, 0, 0);
    }
    `;
}