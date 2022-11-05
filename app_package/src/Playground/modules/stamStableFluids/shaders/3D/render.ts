import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export function setup3D() {
    BABYLON.Effect.IncludesShadersStore["renderVertex"] = `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    // Uniforms
    uniform mat4 worldViewProjection;
    
    // bounding box
    varying vec3 bbPosition;
    varying vec3 bbWorldSize;
    varying vec4 bbQuaternion;
    varying vec3 bbResolution;

    // uniforms
    uniform vec3 bbPos;
    uniform vec3 bbDim;
    uniform vec4 bbRot;
    uniform vec3 bbRes;

    // Varying
    varying vec3 Position;
    varying vec3 Normal;
    varying vec2 UV;

    void main(void) {
        gl_Position = worldViewProjection * vec4(position, 1.0);
        
        Position = position;
        Normal = normal;
        UV = uv;

        bbPosition = bbPos;
        bbWorldSize = bbDim;
        bbQuaternion = bbRot;
        bbResolution = bbRes;
    }
    `
    
    BABYLON.Effect.ShadersStore["renderDepthVertexShader"] = `
    #version 300 es
    precision highp float;

    // Attributes
    in vec3 position;
    in vec3 normal;
    in vec2 uv;

    // Uniforms
    uniform mat4 worldViewProjection;
    
    // bounding box
    out vec3 bbPosition;
    out vec3 bbWorldSize;
    out vec4 bbQuaternion;
    out vec3 bbResolution;

    // uniforms
    uniform vec3 bbPos;
    uniform vec3 bbDim;
    uniform vec4 bbRot;
    uniform vec3 bbRes;

    // Varying
    out vec3 Position;
    out vec3 Normal;
    out vec2 UV;

    void main(void) {
        gl_Position = worldViewProjection * vec4(position, 1.0);
        
        Position = position;
        Normal = normal;
        UV = uv;

        bbPosition = bbPos;
        bbWorldSize = bbDim;
        bbQuaternion = bbRot;
        bbResolution = bbRes;
    }
    `;
    BABYLON.Effect.ShadersStore["renderDepthFragmentShader"] = `
    #version 300 es
    precision highp float;

    //layout(location = 0) out highp vec4 glFragData[2];
    out vec4 glFragData[2];
    
    //layout (location = 0) out vec4 glFragPos;
    //layout (location = 1) out vec4 glFragNor;

    #include<stam3D_300es_header>

    // Varying
    in vec3 Position;
    in vec3 Normal;
    in vec2 UV;

    // Refs
    uniform vec3 cameraPosition;

    // Texture
    uniform sampler2D sampleSampler;

    void main(void) {
        vec4 samp = vec4(1., 1., 1., 1.);

        vec3 dir = normalize(Position - cameraPosition);
        
        for (float i = 0.1; i < 25.0; i += 0.01) {
            vec3 pos = dir * i / 5. + Position;
            samp = texture3D_CTB_BB(sampleSampler, pos, bbResolution, bbPosition, bbWorldSize, bbQuaternion);
            //samp = texture3D_rndC_BB(sampleSampler, pos, bbResolution, bbPosition, bbWorldSize, bbQuaternion);

            // samp.w is flag value
            // 0 - in volume
            //-1 - out of volume within bounds
            // 1 - out of bounds
            if (samp.w == 1.) {
                // out of bounds
                discard;
            } else if (samp.w >= -0.9 && samp.w <= 0.9) {
                // in volume
                
                // [1] is normal
                float deltaD = 0.05;
                float spl = texture3D_CTB_BB(sampleSampler, pos - vec3(deltaD, 0., 0.), bbResolution, bbPosition, bbWorldSize, bbQuaternion).w;
                float spr = texture3D_CTB_BB(sampleSampler, pos + vec3(deltaD, 0., 0.), bbResolution, bbPosition, bbWorldSize, bbQuaternion).w;
                float spb = texture3D_CTB_BB(sampleSampler, pos - vec3(0., deltaD, 0.), bbResolution, bbPosition, bbWorldSize, bbQuaternion).w;
                float spt = texture3D_CTB_BB(sampleSampler, pos + vec3(0., deltaD, 0.), bbResolution, bbPosition, bbWorldSize, bbQuaternion).w;
                float spp = texture3D_CTB_BB(sampleSampler, pos - vec3(0., 0., deltaD), bbResolution, bbPosition, bbWorldSize, bbQuaternion).w;
                float spf = texture3D_CTB_BB(sampleSampler, pos + vec3(0., 0., deltaD), bbResolution, bbPosition, bbWorldSize, bbQuaternion).w;

                vec3 grad = -normalize(vec3(spr - spl, spt - spb, spf - spp));

                // [0] is position
                glFragData[0] = vec4(pos, 1.);

                glFragData[1] = vec4(grad, 1.);
                return;
            } else {
                // out of volume within bounds
            }
        }
        discard;
    }
    `;



    /* // final post process vertex shader absolute pass
    #define WEBGL2 
    #define SHADER_NAME vertex:postprocess
    precision highp float;
    in vec2 position;
    uniform vec2 scale;
    out vec2 vUV;
    const vec2 madd=vec2(0.5,0.5);
    #define CUSTOM_VERTEX_DEFINITIONS
    void main(void) {
        #define CUSTOM_VERTEX_MAIN_BEGIN
        vUV=(position*madd+madd)*scale;
        gl_Position=vec4(position,0.0,1.0);
        #define CUSTOM_VERTEX_MAIN_END
    }
    */
    BABYLON.Effect.ShadersStore["finalFragmentShader"] = `
    precision highp float;
    
    #include<stam3D_header>

    // Varying
    varying vec2 vUV;

    // Refs
    uniform vec3 cameraPosition;
    uniform vec3 bbPos;
    uniform vec3 bbDim;
    uniform vec4 bbRot;
    uniform vec3 bbRes;
    uniform float renderRes; // actually the inverse of render resolution

    // Texture
    uniform sampler2D depthSampler;
    uniform sampler2D gradientSampler;
    uniform sampler2D voxelSampler;

    vec3 bts(sampler2D x, vec2 P, float resolution) {
        vec2 pixel = P * resolution + 0.5;
        
        vec2 frac = fract(pixel);
        pixel = (floor(pixel) / resolution) - vec2(1./resolution/2.0);

        vec3 C11 = texture2D(x, pixel + vec2(0.0, 0.0)).xyz;
        vec3 C21 = texture2D(x, pixel + vec2(1./resolution, 0.0)).xyz;
        vec3 C12 = texture2D(x, pixel + vec2(0.0, 1./resolution)).xyz;
        vec3 C22 = texture2D(x, pixel + vec2(1./resolution, 1./resolution)).xyz;

        vec3 x1 = mix(C11, C21, frac.x);
        vec3 x2 = mix(C12, C22, frac.x);
        return mix(x1, x2, frac.y);
    }

    void main(void) {
        vec4 last = texture2D(textureSampler, vUV);
        if (last == vec4(0., 0., 0., 1.)) {
            vec2 absoluteUV = floor(vUV / renderRes) * renderRes;

            /* -----
            // Central forwarding gradient
            vec4 pc = texture2D(depthSampler, absoluteUV);
            vec4 pl = texture2D(depthSampler, absoluteUV - 1.*vec2(renderRes, 0.));
            vec4 pr = texture2D(depthSampler, absoluteUV + 1.*vec2(renderRes, 0.));
            vec4 pt = texture2D(depthSampler, absoluteUV - 1.*vec2(0., renderRes));
            vec4 pb = texture2D(depthSampler, absoluteUV + 1.*vec2(0., renderRes));
            
            vec3 dx = ((pr - pl) * 0.5).xyz;
            vec3 dy = ((pt - pb) * 0.5).xyz;
            vec3 norm = normalize(cross(dx, dy));
            */
            
            /* ------
            // Diagonal forwarding gradient
            vec4 pc = texture2D(depthSampler, absoluteUV);
            vec4 pbr = texture2D(depthSampler, absoluteUV + 1.*vec2(renderRes, renderRes));
            vec4 pb = texture2D(depthSampler, absoluteUV + 1.*vec2(0, renderRes));
            vec4 pr = texture2D(depthSampler, absoluteUV + 1.*vec2(renderRes, 0));

            vec3 dx = (pbr - pc).xyz;
            vec3 dy = (pr - pb).xyz;
            vec3 norm = normalize(cross(dx, dy));
            gl_FragColor = vec4(norm, 1.);
            */
            
            vec4 pc = texture2D(depthSampler, absoluteUV);
            vec3 norm = texture2D(gradientSampler, absoluteUV).xyz;

            /* -----
            // Tricubic filtering diagonal forwarding gradient
            // from position we need to convert to UV coordinates
            // from UV coordinates we Tricubic sample the texture to get 
            vec3 pc = bts(depthSampler, vUV, 1./renderRes);
            vec3 pbr = bts(depthSampler, vUV + 1.*vec2(renderRes, renderRes), 1./renderRes);
            vec3 pb = bts(depthSampler, vUV + 1.*vec2(0, renderRes), 1./renderRes);
            vec3 pr = bts(depthSampler, vUV + 1.*vec2(renderRes, 0), 1./renderRes);

            vec3 dx = pbr - pc;
            vec3 dy = pr - pb;
            vec3 norm = normalize(cross(dx, dy));
            */
            
            vec2 diff = (vUV - absoluteUV) / renderRes;
            
            vec3 vLightPosition = vec3(5,20,10);
            vec3 vPosition = pc.xyz;
            vec3 vNormal = norm;

            // World values
            vec3 vPositionW = vPosition;
            vec3 vNormalW = norm;
            vec3 viewDirectionW = normalize(cameraPosition - vPositionW);
            
            // Light
            vec3 lightVectorW = normalize(vLightPosition - vPositionW);
            vec3 color = abs(vPosition * 4.);
            
            // diffuse
            float ndl = max(0., dot(vNormalW, lightVectorW));
            
            // Specular
            vec3 angleW = normalize(viewDirectionW + lightVectorW);
            float specComp = max(0., dot(vNormalW, angleW));
            specComp = pow(specComp, max(1., 64.));
            
            gl_FragColor = vec4(color * ndl + vec3(specComp), 1.);
        } else {
            gl_FragColor = last;
        }
    }
    `
}