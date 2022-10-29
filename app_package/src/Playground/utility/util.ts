import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

import { PI } from "./constants";

// Relevant functions to render to plane
/*
Rendering to a plane requires a few steps:
1. Create render target texture (destination for rendering), and attach to scene            BABYLON.RenderTargetTexture
2. Create scene objects to add to render target texture                                     renderTarget.renderList.push
    a. if rendering slices of real objects, continue
    b. if rendering from texture w/ shader, render to a plane covering the entire screen
3. Create render-independent camera (by constructing relevant matrices)                     
4. Pass all values to shaders
*/

export class PlaneKernel {
    // ----- Scenes -----
    mainScene: BABYLON.Scene;
    renderScene: BABYLON.Scene;

    // ----- Default render objects -----
    // possible extensions of this class may have multiple camera/plane/shader pairs so that
    //  distinct shaders can compute in parallel, however this structure allows for each shader
    //  to be run separately at the cost of additional overhead
    camera: BABYLON.ArcRotateCamera;
    plane: BABYLON.Mesh;
    shader: BABYLON.ShaderMaterial;
    texture: BABYLON.RenderTargetTexture;
    
    /* The way this works is as follows:
    1. There exists some BABYLON.RenderTargetTexture sent to an object of this class
    2. This class constructs a plane to be added to the render target using renderTarget.renderList.push
        this plane cannot be reused for all PlaneShader objects as it has a unique shader material
    3. This class contains a camera to be used by the render target setting renderTarget.activeCamera
        this camera can be reused for all PlaneShader objects
    4. This class constructs a shader material that will be applied to the unique plane
    */

    // Creates render scene paired with main scene
    // Creates lots of "scene" object overhead
    // I am not sure entirely how to avoid this without adequate compute shader support
    // Essentially what this does is create a new scene for each shader kernel
    constructor(mainScene: BABYLON.Scene) {
        this.mainScene = mainScene;
        this.renderScene = new BABYLON.Scene(mainScene.getEngine());
    }

    // returns the render target texture as a material in main scene
    genEmissiveMat(name: string): BABYLON.StandardMaterial {
		var mat = new BABYLON.StandardMaterial(name, this.mainScene);
		mat.emissiveTexture = this.texture;
        mat.emissiveTexture.updateSamplingMode(4);
        mat.disableLighting = true;
        return mat;
    }
    genDiffuseMat(name: string): BABYLON.StandardMaterial {
		var mat = new BABYLON.StandardMaterial(name, this.mainScene);
		mat.diffuseTexture = this.texture;
        return mat;
    }

    // adds or overrides current texture/camera/plane/shader
    // usually only called after the initialization of a PlaneKernel object
    // shaders that are run are to be set up externally of the object
    genTexture(w: number, h: number, name: string, shader: BABYLON.ShaderMaterial) {
        this.shader = shader;

        var renderCamera = new BABYLON.ArcRotateCamera(name + "Camera", -PI/2., 0, 5, new BABYLON.Vector3(0, 0, 0), this.renderScene);
		renderCamera.setTarget(BABYLON.Vector3.Zero());
		renderCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
		renderCamera.orthoTop = 5;
		renderCamera.orthoBottom = -5;
		renderCamera.orthoLeft = -5;
		renderCamera.orthoRight = 5;
        this.camera = renderCamera;

		var renderPlane = BABYLON.MeshBuilder.CreateGround(name + "Plane", { width: 10, height: 10 }, this.renderScene);
        this.plane = renderPlane;
        this.plane.material = this.shader;

        this.texture = new BABYLON.RenderTargetTexture(name, { width: w, height: h }, this.renderScene);
        this.texture.activeCamera = this.camera;
        this.texture.renderList?.push(this.plane);

        this.renderScene.customRenderTargets.push(this.texture);
    }

    // calls renderScene.render() in order to compute the provided kernel to the render target texture
    render() {
        // the render plane's material is already set to the shader, so once we compute this.renderScene.render()
        //  the shader will be computed to the material, and then the render target texture will copy the shader contents
        //  which can then be read to a material
        this.renderScene.render();
    }
}

// manages two plane kernel objects and toggles the active one for texture ping-ponging
export class PingPongPlaneKernel {
    // ----- Kernels -----
    kernelA: PlaneKernel;
    materialA: BABYLON.StandardMaterial;
    kernelB: PlaneKernel;
    materialB: BABYLON.StandardMaterial;
    toggle: boolean;

    // ----- Constructor -----
    constructor(scene: BABYLON.Scene, w: number, h: number, name: string, shaderPath: any, options: any) {
        this.toggle = false;
        
        this.kernelA = new PlaneKernel(scene);
        this.kernelB = new PlaneKernel(scene);

        var shaderA = new BABYLON.ShaderMaterial(
            name + "A_shader",
            this.kernelA.renderScene,
            shaderPath,
            options
        );
        var shaderB = new BABYLON.ShaderMaterial(
            name + "B_shader",
            this.kernelA.renderScene,
            shaderPath,
            options
        );

        this.kernelA.genTexture(w, h, name, shaderA);
        this.kernelB.genTexture(w, h, name, shaderB);

        this.materialA = this.kernelA.genEmissiveMat(name + "A_mat");
        this.materialA = this.kernelB.genEmissiveMat(name + "B_mat");
    }

    // ----- Get Current Material -----
    getEmissiveMat(): BABYLON.StandardMaterial {
        return (this.toggle ? this.materialA : this.materialB);
    }

    // ----- Get Current Texture -----
    getTexture(): BABYLON.RenderTargetTexture {
        return (this.toggle ? this.kernelA.texture : this.kernelB.texture);
    }

    // ----- Render -----
    render() {
        if (this.toggle) {
            this.kernelA.render();
        } else {
            this.kernelB.render();
        }
        this.toggle = !this.toggle;
    }

    // ----- Global Shader Management -----
    setFloat(name: string, float: number) {
        this.kernelA.shader.setFloat(name, float);
        this.kernelB.shader.setFloat(name, float);
    }
    setVec2(name: string, vec2: BABYLON.Vector2) {
        this.kernelA.shader.setVector2(name, vec2);
        this.kernelB.shader.setVector2(name, vec2);
    }
    setVec3(name: string, vec3: BABYLON.Vector3) {
        this.kernelA.shader.setVector3(name, vec3);
        this.kernelB.shader.setVector3(name, vec3);
    }
    setVec4(name: string, vec4: BABYLON.Vector4) {
        this.kernelA.shader.setVector4(name, vec4);
        this.kernelB.shader.setVector4(name, vec4);
    }
    setTexture(name: string, texture: BABYLON.BaseTexture) {
        this.kernelA.shader.setTexture(name, texture);
        this.kernelB.shader.setTexture(name, texture);
    }
}

// creates multiple textures in a linear fashion, normalized access in shader, possibly decreased overhead in GPU as smaller portions of textures have to be loaded each frame
// requires each texture plane to be loaded twice per adjacency
// allows for texture targeting for areas of complex space compared to areas that are empty
export class MultipleBoxKernel {
    // ----- Scenes -----
    mainScene: BABYLON.Scene;

    // ----- Default render objects -----
    kernels: PlaneKernel[];

    // ----- Constructor -----
    constructor(mainScene: BABYLON.Scene) {
        this.mainScene = mainScene;
        this.kernels = [];
    }

    // ----- Materials -----
    // returns the render target textures as materials in main scene
    genEmissiveMats(name: string): BABYLON.StandardMaterial[] {
        var mats: BABYLON.StandardMaterial[] = [];
        for (const kernel of this.kernels) {
            var mat = new BABYLON.StandardMaterial(name, this.mainScene);
            mat.emissiveTexture = kernel.texture;
            mat.emissiveTexture.updateSamplingMode(4);
            mat.disableLighting = true;
            mats.push(mat);
        }
        return mats;
    }
    genDiffuseMats(name: string): BABYLON.StandardMaterial[] {
		var mats: BABYLON.StandardMaterial[] = [];
        for (const kernel of this.kernels) {
            var mat = new BABYLON.StandardMaterial(name, this.mainScene);
            mat.diffuseTexture = kernel.texture;
            mats.push(mat);
        }
        return mats;
    }

    // ----- Getters -----
    isLast(index: number): boolean {
        return index == this.kernels.length - 1;
    }
    isFirst(index: number): boolean {
        return index == 0;
    }
    getAdjacent(index: number): PlaneKernel[] {
        if (index >= this.kernels.length || index < 0) {
            return [];
        }

        if (index == 0 && this.kernels.length > 1) {
            return [this.kernels[1]];
        }

        if (index == this.kernels.length - 1 && index > 0) {
            return [this.kernels[this.kernels.length - 2]];
        }

        return [this.kernels[index - 1], this.kernels[index + 1]];
    }

    // ----- Add L Textures of Dimensions W x H -----
    genTextures(w: number, h: number, l: number, name: string, shaderPath: any, options: any) {
        for (var i = 0; i < l; i ++) {
            var kernel = new PlaneKernel(this.mainScene);

            var shader = new BABYLON.ShaderMaterial(
                name + "_" + i + "_shader",
                kernel.renderScene,
                shaderPath,
                options
            );

            kernel.genTexture(w, h, name + "_" + i + "_texture", shader);

            this.kernels.push(kernel);
        }
    }

    // ----- Global Shader Management -----
    setFloat(name: string, float: number) {
        for (var i = 0; i < this.kernels.length; i ++) {
            this.kernels[i].shader.setFloat(name, float);
        }
    }
    setVec2(name: string, vec2: BABYLON.Vector2) {
        for (var i = 0; i < this.kernels.length; i ++) {
            this.kernels[i].shader.setVector2(name, vec2);
        }
    }
    setVec3(name: string, vec3: BABYLON.Vector3) {
        for (var i = 0; i < this.kernels.length; i ++) {
            this.kernels[i].shader.setVector3(name, vec3);
        }
    }
    setVec4(name: string, vec4: BABYLON.Vector4) {
        for (var i = 0; i < this.kernels.length; i ++) {
            this.kernels[i].shader.setVector4(name, vec4);
        }
    }
    setTexture(name: string, texture: BABYLON.BaseTexture) {
        for (var i = 0; i < this.kernels.length; i ++) {
            this.kernels[i].shader.setTexture(name, texture);
        }
    }
}

// creates singular texture in a linear fashion, decentralized access in shader, possibly decreased overhead in CPU as object storage is singular (size O(1) as opposed to size O(L))
// possibly decrease in efficiency on GPU as each individual 3D texture is massive and has to be loaded each iteration
// no targeting (empty spaces are loaded just as much as full spaces are)
export class SingleBoxKernel {
    // ----- Scenes -----
    mainScene: BABYLON.Scene;
    renderScene: BABYLON.Scene;

    // ----- Default render objects -----
    camera: BABYLON.ArcRotateCamera;
    plane: BABYLON.Mesh;
    shader: BABYLON.ShaderMaterial;
    texture: BABYLON.RenderTargetTexture;
}

// attempts to replicate OpenGL FBOs
// instead of having compiled shaders that can be used for all FBOs, each FBO stores a set of shaders
// this does result in duplicate shaders, but because shaders are compiled to each scene, this is a necessary action if multiple shaders want to be used for a single FBO
export class PlaneFBO {
    // ----- Scenes -----
    mainScene: BABYLON.Scene;
    renderScene: BABYLON.Scene;
    renderSceneOptimizer: BABYLON.SceneOptimizer;
    
    // ----- Shader storage -----
    shaders: BABYLON.ShaderMaterial[];
    activeShader: BABYLON.ShaderMaterial;

    // ----- Render objects -----
    camera: BABYLON.ArcRotateCamera;
    plane: BABYLON.Mesh;
    texture: BABYLON.RenderTargetTexture;

    // ----- Miscellaneous -----
    name: string;

    // ----- Constructor -----
    constructor(name: string, dimensions: { width: number, height: number }, scene: BABYLON.Scene) {
        this.name = name;
        this.shaders = [];

        // scenes
        this.mainScene = scene;
        this.renderScene = new BABYLON.Scene(this.mainScene.getEngine());

        // optimizer
        BABYLON.SceneOptimizer.OptimizeAsync(this.renderScene);

        // render objects
        let w = dimensions.width;
        let h = dimensions.height;

        var renderCamera = new BABYLON.ArcRotateCamera(name + "Camera", -PI/2., 0, 5, new BABYLON.Vector3(0, 0, 0), this.renderScene);
		renderCamera.setTarget(BABYLON.Vector3.Zero());
		renderCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
		renderCamera.orthoTop = 5;
		renderCamera.orthoBottom = -5;
		renderCamera.orthoLeft = -5;
		renderCamera.orthoRight = 5;
        this.camera = renderCamera;

		var renderPlane = BABYLON.MeshBuilder.CreateGround(name + "Plane", { width: 10, height: 10 }, this.renderScene);
        this.plane = renderPlane;

        this.texture = new BABYLON.RenderTargetTexture(name, { width: w, height: h }, this.renderScene, undefined, undefined, 2, undefined, undefined, undefined, undefined, undefined, 5);
        this.texture.activeCamera = this.camera;
        this.texture.renderList?.push(this.plane);

        this.renderScene.customRenderTargets.push(this.texture);
    }

    // ----- Add shader -----
    addShader(shaderPath: any, options: any): number {
        // returns index of shader in shader storage
        var shader = new BABYLON.ShaderMaterial(
            this.name + "_shader" + this.shaders.length,
            this.renderScene,
            shaderPath,
            options
        );
        return this.shaders.push(shader) - 1;
    }

    // ----- Set shader -----
    setActiveShader(index: number) {
        // sets the active shader and updates relevant materials
        if (index >= this.shaders.length || index < 0) return;

        // update render target material
        this.texture.setMaterialForRendering(this.plane, this.shaders[index]);

        // update active shader
        this.activeShader = this.shaders[index];
    }

    // ----- Render -----
    render() {
        this.renderScene.render();
    }

    // ----- Update shader constants -----
    setFloat(name: string, float: number) {
        this.activeShader.setFloat(name, float);
    }
    setVec2(name: string, vec2: BABYLON.Vector2) {
        this.activeShader.setVector2(name, vec2);
    }
    setVec3(name: string, vec3: BABYLON.Vector3) {
        this.activeShader.setVector3(name, vec3);
    }
    setVec4(name: string, vec4: BABYLON.Vector4) {
        this.activeShader.setVector4(name, vec4);
    }
    setTexture(name: string, texture: BABYLON.BaseTexture) {
        this.activeShader.setTexture(name, texture);
    }

    // ----- Get mat -----
    genEmissiveMat(name: string): BABYLON.StandardMaterial {
		var mat = new BABYLON.StandardMaterial(name, this.mainScene);
		mat.emissiveTexture = this.texture;
        mat.emissiveTexture.updateSamplingMode(4);
        mat.disableLighting = true;
        return mat;
    }
}

// ping pong FBO
export class PingPongPlaneFBO {
    // ----- FBOs -----
    FBOA: PlaneFBO;
    FBOB: PlaneFBO;
    currentFBO: PlaneFBO;
    current: boolean;

    // ----- Materials -----
    FBOA_mat: BABYLON.StandardMaterial;
    FBOB_mat: BABYLON.StandardMaterial;

    // ----- Constructor -----
    constructor(name: string, dimensions: { width: number, height: number }, scene: BABYLON.Scene) {
        this.FBOA = new PlaneFBO(name + "_A", dimensions, scene);
        this.FBOB = new PlaneFBO(name + "_B", dimensions, scene);
        this.currentFBO = this.FBOA;
        this.current = true;
        this.FBOA_mat = this.FBOA.genEmissiveMat("mat_A");
        this.FBOB_mat = this.FBOB.genEmissiveMat("mat_B");
    }

    // ----- Add shader -----
    addShader(shaderPath: any, options: any): number {
        this.FBOA.addShader(shaderPath, options);
        return this.FBOB.addShader(shaderPath, options);
    }

    // ----- Set active shader -----
    setActiveShader(index: number) {
        this.currentFBO.setActiveShader(index);
    }
    
    // ----- Update shader constants -----
    setFloat(name: string, float: number) {
        this.currentFBO.activeShader.setFloat(name, float);
    }
    setVec2(name: string, vec2: BABYLON.Vector2) {
        this.currentFBO.activeShader.setVector2(name, vec2);
    }
    setVec3(name: string, vec3: BABYLON.Vector3) {
        this.currentFBO.activeShader.setVector3(name, vec3);
    }
    setVec4(name: string, vec4: BABYLON.Vector4) {
        this.currentFBO.activeShader.setVector4(name, vec4);
    }
    setTexture(name: string, texture: BABYLON.BaseTexture) {
        this.currentFBO.activeShader.setTexture(name, texture);
    }

    // ----- Render -----
    render() {
        this.currentFBO.render();
        this.current = !this.current;
        this.currentFBO = (this.current ? this.FBOA : this.FBOB);
    }

    // ----- Get active/inactive material -----
    getActiveMat(): BABYLON.StandardMaterial {
        return (this.current ? this.FBOA_mat : this.FBOB_mat);
    }
    getInactiveMat(): BABYLON.StandardMaterial {
        return (!this.current ? this.FBOA_mat : this.FBOB_mat);
    }

    // ----- Get active/inactive texture -----
    getActiveTex(): BABYLON.RenderTargetTexture {
        return this.currentFBO.texture;
    }
    getInactiveTex(): BABYLON.RenderTargetTexture {
        return (!this.current ? this.FBOA.texture : this.FBOB.texture);
    }
}