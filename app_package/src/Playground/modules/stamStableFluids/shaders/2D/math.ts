import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export function setup() {
    BABYLON.Effect.IncludesShadersStore["stam2D_math"] = `
    // Jacobi iteration
    // Poisson-pressure equation; x -> p, b -> del dot w, alpha -> -(delta x)^2, beta -> 4
    // Viscous x,b -> u (velocity field), alpha = (delta x)^2/v delta t, beta -> 4 + alpha
    void jacobi(vec2 coords, out vec4 xNew, float alpha, float rbeta, sampler2D x, sampler2D b) {
        float delx = 1. / res.x;
        float dely = 1. / res.y;

        vec4 xL = texture2D_CTB(x, coords - vec2(delx, 0.));
        vec4 xR = texture2D_CTB(x, coords + vec2(delx, 0.));
        vec4 xB = texture2D_CTB(x, coords - vec2(0., dely));
        vec4 xT = texture2D_CTB(x, coords + vec2(0., dely));

        vec4 bC = texture2D_CTB(b, coords);

        xNew = (xL + xR + xB + xT + alpha * bC) * rbeta;
    }

    // Divergence
    void divergence(vec2 coords, out vec4 div, sampler2D x) {
        float delx = 1. / res.x;
        float dely = 1. / res.y;

        vec4 xL = texture2D_CTB(x, coords - vec2(delx, 0.));
        vec4 xR = texture2D_CTB(x, coords + vec2(delx, 0.));
        vec4 xB = texture2D_CTB(x, coords - vec2(0., dely));
        vec4 xT = texture2D_CTB(x, coords + vec2(0., dely));

        div = vec4((res.x / res.y) * 0.5 * ((xR.x - xL.x) + (xT.y - xB.y)));
    }

    // Gradient
    void gradient(vec2 coords, out vec4 uNew, sampler2D p, sampler2D w) {        
        float delx = 1. / res.x;
        float dely = 1. / res.y;

        float pL = texture2D_CTB(p, coords - vec2(delx, 0.)).x;
        float pR = texture2D_CTB(p, coords + vec2(delx, 0.)).x;
        float pB = texture2D_CTB(p, coords - vec2(0., dely)).x;
        float pT = texture2D_CTB(p, coords + vec2(0., dely)).x;
        
        uNew = texture2D_CTB(w, coords);
        uNew.xy -= (res.x / res.y) * 0.5 * vec2(pR - pL, pT - pB);
    }
    `;
}