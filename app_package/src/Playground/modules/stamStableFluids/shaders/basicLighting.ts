import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export function setup() {
    BABYLON.Effect.ShadersStore["basicLightingVertexShader"] = `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    // Uniforms
    uniform mat4 worldViewProjection;

    // Varying
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUV;

    void main(void) {
        vec4 outPosition = worldViewProjection * vec4(position, 1.0);
        gl_Position = outPosition;
        
        vUV = uv;
        vPosition = position;
        vNormal = normal;
    }
    `;

    BABYLON.Effect.ShadersStore["basicLightingFragmentShader"] = `
    precision highp float;

    // Varying
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUV;

    // Uniforms
    uniform mat4 world;

    // Refs
    uniform vec3 cameraPosition;

    // Lights
    uniform vec3 lightPos;

    void main(void) {
        //vec3 lightPos = vec3(0, 20, 10);
        vec3 viewPos = cameraPosition;
        vec3 lightColor = vec3(0.3, 0.5, 1.0);

        //vec3 N = vNormal;
        // compute normal
        vec3 dx = dFdx(vPosition);
        vec3 dy = dFdy(vPosition);
        vec3 N = -normalize(cross(dx, dy));

        // ambient
        float ambientStrength = 0.1;
        vec3 ambient = ambientStrength * lightColor;
        
        // diffuse 
        vec3 norm = normalize(N);
        vec3 lightDir = normalize(lightPos - vPosition);
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuse = diff * lightColor;
        
        // specular
        float specularStrength = 0.5;
        vec3 viewDir = normalize(viewPos - vPosition);
        vec3 reflectDir = reflect(lightDir, norm);  
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.);
        vec3 specular = specularStrength * spec * lightColor;
            
        vec3 result = (ambient + diffuse + specular) * vec3(1., 1., 1.);
        gl_FragColor = vec4(result, 1.0);
    }
    `;
}