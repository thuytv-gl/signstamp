import {
    initializeImageMagick,
    Magick,
    MagickImage,
    MagickReadSettings,
} from '@imagemagick/magick-wasm';
import { Show, createMemo, createSignal } from 'solid-js'
import { fabric } from 'fabric';
import './App.css'

function fileToUrl(f: File): Promise<string> {
    const freader = new FileReader()
    return new Promise((resole, reject) => {
        freader.addEventListener("load", () => {
            if (typeof freader.result === "string")
                resole(freader.result);
        });
        freader.addEventListener("error", () => {
            reject(freader.error);
        });
        freader.readAsDataURL(f);
    });
}

const wasmLocation = new URL('@imagemagick/magick-wasm/magick.wasm', import.meta.url).href;
function App() {
    const [loading, setLoading] = createSignal(true);
    const [error, setError] = createSignal("");
    let canvasRef: HTMLCanvasElement | undefined;
    let canvas: fabric.Canvas = new fabric.Canvas('canvas');
    let ksignature: fabric.Image = new fabric.Image("p");
    let kimage: fabric.Image = new fabric.Image("p");

    initializeImageMagick(wasmLocation)
        .then(() => {
            console.log('vertion', Magick.imageMagickVersion);
            setLoading(false);
        }).catch((err: any) => {
            console.error(err);
            setError(err);
        });

    const calculateRatio = (srcWidth: number, srcHeight: number, maxWidth: number, maxHeight: number) => {
        return Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    }

    function addGesture(_canvas: fabric.Canvas) {
        /*
        let cx = 0,
            zoomStartScale = canvas.getZoom();
        const touchStart = (e: fabric.IEvent<MouseEvent>) => {
            if (e.e.touches && e.e.touches.length == 2) {
                const [t1, t2] = e.e.touches;
                cx = Math.abs(t1.clientX - t2.clientX);
            }
        }
        const touchZoom = (e: fabric.IEvent<TouchEvent>) => {
            if (e.e.touches && e.e.touches.length == 2) {
                const [t1, t2] = e.e.touches;
                const dx = Math.abs(t1.clientX - t2.clientX);
                setDebug(JSON.stringify(dx - cx));
                const point = new fabric.Point(e.pointer.x, e.pointer.y);
                if (e.self.state == "start") {
                    zoomStartScale = canvas.getZoom();
                }
                const delta = zoomStartScale * e.self.scale;
                canvas.zoomToPoint(point, delta);
                e.e.preventDefault();
                e.e.stopPropagation();
            }
        }

        const mouseZoom = (opt: fabric.IEvent<WheelEvent>) => {
            const delta = opt.e.deltaY;
            let zoom = canvas.getZoom();
            zoom *= 0.999 ** delta;
            if (zoom > 20) zoom = 20;
            if (zoom < 1) zoom = 1;
            canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        }
        canvas.on("mouse:down", touchStart);
        canvas.on("mouse:wheel", mouseZoom);
        canvas.on("mouse:move", touchZoom);
        */
    }

    const resizeCanvas = (width: number, height: number) => {
        if (canvas) { canvas.dispose(); }
        const maxW = document.documentElement.clientWidth * 0.95;
        const maxH = document.documentElement.clientHeight * 0.9;
        const ratio = calculateRatio(width, height, maxW, maxH);
        if (canvasRef) {
            canvasRef.width = width * ratio;
            canvasRef.height = height * ratio;
        }
        canvas = new fabric.Canvas("canvas", { selection: false });
        canvas.setWidth(width * ratio)
        canvas.setHeight(height * ratio);
        addGesture(canvas);
    };

    const handleImageChanged = async (evt: Event) => {
        const target = evt.target as HTMLInputElement;
        const file = target?.files?.[0];
        if (!file) {
            return;
        }
        setLoading(true);
        const arrayBuffer = await file.arrayBuffer();
        const array = new Uint8Array(arrayBuffer);
        const img = MagickImage.create(array, new MagickReadSettings());
        resizeCanvas(img.width, img.height);
        const c = document.createElement("canvas");
        img.writeToCanvas(c);
        const fimg = new fabric.Image(c);

        resizeCanvas(img.width, img.height);
        if (img.width && img.height && canvas.width && canvas.height) {
            const ratio = calculateRatio(img.width!, img.height!, canvas.width!, canvas.height!);
            fimg.set("top", 0);
            fimg.set("left", 0);
            fimg.set("scaleX", ratio);
            fimg.set("scaleY", ratio);
            fimg.set("selectable", false);
            fimg.set("moveCursor", "none");
            fimg.set("hoverCursor", "auto");
            if (kimage) { canvas.remove(kimage); }
            kimage = fimg;
            canvas.add(fimg).sendToBack(fimg).requestRenderAll();
        }
        setLoading(false);
    };

    const handSignatureChanged = (evt: Event) => {
        const target = evt.target as HTMLInputElement;
        const file = target?.files?.[0];
        if (file) {
            fileToUrl(file).then((url: string) => {
                fabric.Image.fromURL(url, (img) => {
                    const ratio = calculateRatio(img.width!, img.height!, canvas.width!, canvas.height!) * 0.45;
                    img.set("top", 0);
                    img.set("left", 0);
                    img.set("scaleX", ratio);
                    img.set("scaleY", ratio);
                    if (ksignature) {
                        canvas.remove(ksignature);
                    }
                    ksignature = img;
                    canvas.add(img)
                        .bringToFront(img)
                        .requestRenderAll();
                });
            })
        }
    };

    const downloadURI = (uri: string, name: string) => {
        const link = document.createElement("a");
        link.download = name;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handleDownload = () => {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        const url = canvas.toDataURL({ format: "jpeg", quality: 1, multiplier: kimage.width! / canvas.width! });
        downloadURI(url, "chuky.jpeg");
    }

    const ready = createMemo(() => !error() && !loading());

    return (
        <>
            <Show when={!error() && loading()}>
                <div class="py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            </Show>
            <Show when={error()}>
                <div class="alert alert-warning" role="alert">
                    Tải ứng dụng thất bại, vui lòng thử lại sau!
                    <br />
                    Mã lỗi: {error()}
                </div>
            </Show>
            <div style={{ display: ready() ? "block" : "none" }}>
                <div class="editor d-flex justify-items-center w-full">
                    <canvas style={{ width: "100%" }} ref={canvasRef} id="canvas" />
                </div>
                <div class="form my-2 d-flex justify-content-between">
                    <span>
                        <label class="btn btn-primary p-2" for="image">Chọn ảnh</label>
                        <input accept="image/*" class="d-none" id="image" type="file" onChange={(e) => handleImageChanged(e)} />
                    </span>
                    <span>
                        <label class="btn btn-primary p-2" for="signature">Chọn chữ ký</label>
                        <input accept="image/*" class="d-none" id="signature" type="file" onChange={(e) => handSignatureChanged(e)} />
                    </span>
                    <button class="btn btn-primary p-2 loading" onClick={handleDownload}>Tải ảnh</button>
                </div>
            </div>
        </>
    )
}

export default App
