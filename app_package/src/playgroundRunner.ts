import { Engine } from "@babylonjs/core";
import { CreatePlayground, RenderLoop } from "./Playground/playground";

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
    const playground = CreatePlayground(engine, canvas);
    engine.runRenderLoop(() => {
        RenderLoop(playground);
    });
    window.addEventListener("resize", () => {
        engine.resize();
    });
}

