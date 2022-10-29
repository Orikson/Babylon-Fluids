import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export function setup() {
    BABYLON.Effect.ShadersStore["stam2D_advectionStepVertexShader"] = `
    #include<stam2D_vertex>
    `;
    BABYLON.Effect.ShadersStore["stam2D_advectionStepFragmentShader"] = `
    #include<stam2D_header>
    #include<stam2D_math>
    #include<stam2D_advectionFuncs>

    void main(void) {
        vec4 force = vec4(0.);
        if (mDown != 0.) {
            vec2 orgPos = mpos / res; // original mouse position rescaled
            vec2 relMmt = rel / res; // relative mouse motion rescaled
            float dist = distance(vuv, orgPos);
            float a = 0.12;
            float val = (a / (dist + a)) - 0.5;
            if (dist < 0.15) {
                force = vec4(val*cos(frame/200.), val*sin(frame/100.), val*sin(frame/300.), 1.);
                force = abs(force);
                force *= 0.7;
            }
        }
        advect(vuv, gl_FragColor);
        gl_FragColor += force;
        gl_FragColor *= 0.975;
        //gl_FragColor = vec4(1., 0., 0., 1.);
    }
    `;

    BABYLON.Effect.ShadersStore["stam2D_diffusionStepVertexShader"] = `
    #include<stam2D_vertex>
    `;
    BABYLON.Effect.ShadersStore["stam2D_diffusionStepFragmentShader"] = `
    #include<stam2D_header>
    #include<stam2D_constants>
    #include<stam2D_math>
    #include<stam2D_diffusionFuncs>

    void main(void) {
        diffusion(vuv, gl_FragColor);
    }
    `;

    BABYLON.Effect.ShadersStore["stam2D_divergenceStepVertexShader"] = `
    #include<stam2D_vertex>
    `;
    BABYLON.Effect.ShadersStore["stam2D_divergenceStepFragmentShader"] = `
    #include<stam2D_header>
    #include<stam2D_constants>
    #include<stam2D_math>

    void main(void) {
        divergence(vuv, gl_FragColor, velTex);
    }
    `;

    BABYLON.Effect.ShadersStore["stam2D_divergenceStepVertexShader"] = `
    #include<stam2D_vertex>
    `;
    BABYLON.Effect.ShadersStore["stam2D_divergenceStepFragmentShader"] = `
    #include<stam2D_header>
    #include<stam2D_constants>
    #include<stam2D_math>

    void main(void) {
        divergence(vuv, gl_FragColor, velTex);
    }
    `;

    BABYLON.Effect.ShadersStore["stam2D_forceStepVertexShader"] = `
    #include<stam2D_vertex>
    `;
    BABYLON.Effect.ShadersStore["stam2D_forceStepFragmentShader"] = `
    #include<stam2D_header>
    #include<stam2D_constants>
    #include<stam2D_forceFuncs>

    void main(void) {
        vec4 temp = vec4(0.);
        if (mDown != 0.) {
            applyForce(vuv, temp, 0.5);
        }
        gl_FragColor = texture2D(velTex, vuv) + temp;
    }
    `;

    BABYLON.Effect.ShadersStore["stam2D_gradientStepVertexShader"] = `
    #include<stam2D_vertex>
    `;
    BABYLON.Effect.ShadersStore["stam2D_gradientStepFragmentShader"] = `
    #include<stam2D_header>
    #include<stam2D_constants>
    #include<stam2D_math>

    void main(void) {
        gradient(vuv, gl_FragColor, prsTex, velTex);
    }
    `;

    BABYLON.Effect.ShadersStore["stam2D_pressureStepVertexShader"] = `
    #include<stam2D_vertex>
    `;
    BABYLON.Effect.ShadersStore["stam2D_pressureStepFragmentShader"] = `
    #include<stam2D_header>
    #include<stam2D_constants>
    #include<stam2D_math>

    void main() {
        float delx = 1. / res.x;
        float dely = 1. / res.y;

        // has to be iterated ~40 times on the cpu (texture has to be updated (ping ponged) each time)
        float alpha = -(delx*delx);
        float rbeta = 0.25;
        jacobi(vuv, gl_FragColor, alpha, rbeta, prsTex, tmpTex);
    }
    `;

    BABYLON.Effect.ShadersStore["stam2D_finalStepVertexShader"] = `
    #include<stam2D_vertex>
    `;
    BABYLON.Effect.ShadersStore["stam2D_finalStepFragmentShader"] = `
    #include<stam2D_header>
    
    void main(void) {
        vec4 v = texture2D(velTex, vuv);
        vec4 t = texture2D(tmpTex, vuv);
        vec4 p = texture2D(prsTex, vuv);
        vec4 q = texture2D(qntTex, vuv);
        gl_FragColor = vec4(q.xyz, 1.);
        //gl_FragColor = vec4(v.xyz, 1.);
        //gl_FragColor = vec4(vuv.x * cos(frame / 100.), vuv.y, 0., 1.);
    }
    `;
}