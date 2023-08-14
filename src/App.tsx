import fileSaver from 'file-saver';
import heic2any from 'heic2any';
import { Show, createSignal } from 'solid-js'
import { fabric } from 'fabric';
import './App.css'

function App() {
    const [loading, setLoading] = createSignal(false);
    const [downloading, setDownloading] = createSignal(true);
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
                const hblob = await heic2any({ blob });
                url = URL.createObjectURL(hblob as Blob);
            }
            fabric.Image.fromURL(url, (img) => {
                if (img.width && img.height && canvas.width && canvas.height) {
                    resizeCanvas(img.width, img.height);
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
        try {
            const target = evt.target as HTMLInputElement;
            const file = target?.files?.[0];
            if (file) {
                const blobURL = URL.createObjectURL(file);
                fabric.Image.fromURL(blobURL, (img) => {
                    if (img.width && img.height && canvas.width && canvas.height) {
                        const ratio = calculateRatio(img.width, img.height, canvas.width, canvas.height) * 0.6;
                        const x = canvas.width / 2 - img.width / 2 * ratio;
                        const y = canvas.height - img.height * ratio;
                        img.set("top", y);
                        img.set("left", x);
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
        } catch(e) {
            alert("Lỗi " + JSON.stringify(e));
        }
    };

    const downloadURI = async (uri: string, name: string) => {
        setDownloading(true);
        const blob = await fetch(uri).then(r => r.blob());
        fileSaver(blob, name);
        setLoading(false);
    }

    const handleDownload = () => {
        setDownloading(true);
        setTimeout(async() => {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            const url = canvas.toDataURL({ format: "jpeg", quality: 1, multiplier: kimage.width! / canvas.width! });
            await downloadURI(url, "chuky.jpeg");
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
                    <button disabled={downloading()} class="btn btn-primary p-2" onClick={handleDownload}>
                        <Show when={downloading()}>
                            <div style="height: 25px; width: 25px" class="spinner-border text-default" role="status">
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
