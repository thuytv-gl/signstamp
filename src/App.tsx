import heic2any from 'heic2any';
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

function App() {
    const [loading, setLoading] = createSignal(false);
    const [downloading, setDownloading] = createSignal(false);
    let canvasRef: HTMLCanvasElement | undefined;
    let canvas: fabric.Canvas = new fabric.Canvas('canvas');
    let ksignature: fabric.Image = new fabric.Image("p");
    let kimage: fabric.Image = new fabric.Image("p");

    const calculateRatio = (srcWidth: number, srcHeight: number, maxWidth: number, maxHeight: number) => {
        return Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
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
    };

    const handleImageChanged = async (evt: Event) => {
        try {
            const target = evt.target as HTMLInputElement;
            const file = target?.files?.[0];
            if (!file) {
                return;
            }
            setLoading(true);
            const blobURL = URL.createObjectURL(file);
            let url = blobURL;
            if (file.name.endsWith(".heic")) {
                const blobRes = await fetch(blobURL)
                const blob = await blobRes.blob()
                url = URL.createObjectURL(await heic2any({ blob }));
            }
            fabric.Image.fromURL(url, (img) => {
                resizeCanvas(img.width, img.height);
                if (img.width && img.height && canvas.width && canvas.height) {
                    const ratio = calculateRatio(img.width!, img.height!, canvas.width!, canvas.height!);
                    img.set("top", 0);
                    img.set("left", 0);
                    img.set("scaleX", ratio);
                    img.set("scaleY", ratio);
                    img.set("selectable", false);
                    img.set("moveCursor", "none");
                    img.set("hoverCursor", "auto");
                    if (kimage) { canvas.remove(kimage); }
                    kimage = img;
                    canvas.add(img).sendToBack(img).requestRenderAll();
                }
                setLoading(false);
            });
        } catch (e) {
            alert("Có lỗi xảy ra, vui lòng thử lại");
        }
    };

    const handSignatureChanged = (evt: Event) => {
        const target = evt.target as HTMLInputElement;
        const file = target?.files?.[0];
        if (file) {
            const blobURL = URL.createObjectURL(file);
            fabric.Image.fromURL(blobURL, (img) => {
                if (img.width && img.height && canvas.width && canvas.height) {
                    const ratio = calculateRatio(img.width, img.height, canvas.width, canvas.height) * 0.45;
                    const x = canvas.width / 2 - img.width / 2 * ratio;
                    const y = canvas.height / 2 - img.height / 2 * ratio;
                    img.set("top", x);
                    img.set("left", y);
                    img.set("scaleX", ratio);
                    img.set("scaleY", ratio);
                    if (ksignature) {
                        canvas.remove(ksignature);
                    }
                    ksignature = img;
                    canvas.add(img)
                        .bringToFront(img)
                        .requestRenderAll();
                }
            });
        }
    };

    const downloadURI = (uri: string, name: string) => {
        const link = document.createElement("a");
        link.download = name;
        link.href = uri;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handleDownload = () => {
        setDownloading(true);
        setTimeout(() => {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            const url = canvas.toDataURL({ format: "jpeg", quality: 1, multiplier: kimage.width! / canvas.width! });
            downloadURI(url, "chuky.jpeg");
            setDownloading(false);
        }, 0);
    }

    return (
        <>
            <Show when={loading()}>
                <div class="py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            </Show>
            <div style={{ display: !loading() ? "block" : "none" }}>
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
                    <button disabled={downloading()} class="btn btn-primary p-2 loading" onClick={handleDownload}>
                        <Show when={downloading()}>
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </Show>
                        <Show when={!downloading()}>
                            Tải ảnh
                        </Show>
                    </button>
                </div>
            </div>
        </>
    )
}

export default App
