import { Engine } from "@babylonjs/core";
import { CreatePlaygroundScene } from "./Playground/playground";

export interface InitializeBabylonAppOptions {
    canvas: HTMLCanvasElement;
    assetsHostUrl?: string;
}

export function initializeBabylonApp(options: InitializeBabylonAppOptions) {
    if (options.assetsHostUrl) {
        console.log("Assets host URL: " + options.assetsHostUrl!);
    } else {
        console.log("No assets host URL provided");
    }

    var canvas = options.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.id = "BabylonFluids";
    
    const engine = new Engine(canvas);
    const scene = CreatePlaygroundScene(engine, canvas);
    engine.runRenderLoop(() => {
        scene.render();
    });
    window.addEventListener("resize", () => {
        engine.resize();
    });
}

