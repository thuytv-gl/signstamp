import {
  initializeImageMagick,
  ImageMagick,
  Magick,
  MagickFormat,
  Quantum,
  MagickImage,
} from '@imagemagick/magick-wasm';
import { Show, createEffect, createRenderEffect, createSignal, onMount } from 'solid-js'
import { fabric } from 'fabric';
import solidLogo from './assets/solid.svg'
import viteLogo from '/vite.svg'
import './App.css'

async function fileToUrl(f: File) {
  const freader = new FileReader()
  return new Promise((resole, reject) => {
    freader.addEventListener("load", () => {
      resole(freader.result);
    });
    freader.addEventListener("error", () => {
      reject(freader.error);
    });
    freader.readAsDataURL(f);
  });
}

const wasmLocation = '/magick.wasm';
function App() {
  const [magickLoaded, setMagickLoaded] = createSignal(false);
  const [error, setError] = createSignal("");
  let canvasRef: HTMLCanvasElement;
  let canvas: fabric.Canvas;
  let ksignature: fabric.Image;
  let kimage: fabric.Image;

  initializeImageMagick(wasmLocation)
    .then(() => {
      console.log('vertion', Magick.imageMagickVersion);
      setMagickLoaded(true);
    }).catch(err => {
      console.error(err);
      setError(err);
    });

  onMount(() => {
    canvas = new fabric.Canvas("canvas");
  });

  const calculateRatio = (srcWidth, srcHeight, maxWidth, maxHeight) => {
    return Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  }

  const resizeCanvas = (width: number, height: number) => {
    const maxW = document.documentElement.clientWidth * 0.95;
    const maxH = document.documentElement.clientHeight * 0.9;
    const ratio = calculateRatio(width, height, maxW, maxH);
    canvasRef.width = width * ratio;
    canvasRef.height = height * ratio;
    canvas.setWidth(width * ratio);
    canvas.setHeight(height * ratio);
  };

  const handleImageChanged = (evt: InputEvent) => {
    const target = evt.target as HTMLInputElement;
    const file = target.files[0];
    if (!file) {
      return;
    }
    /*
    file.arrayBuffer()
      .then(r => new Uint8Array(r))
      .then(array => {
        ImageMagick.read(array, (_image) => {
          console.log(image);
        });
      });
      */
    fileToUrl(file).then(url => {
      fabric.Image.fromURL(url, (img) => {
        resizeCanvas(img.width, img.height);
        const ratio = calculateRatio(img.width, img.height, canvas.width, canvas.height);
        img.set("top", 0);
        img.set("left", 0);
        img.set("scaleX", ratio);
        img.set("scaleY", ratio);
        img.set("selectable", false);
        if (kimage) {
          canvas.remove(kimage);
        }
        kimage = img;
        canvas.add(img)
          .requestRenderAll();
      });
    })

  };
  const handSignatureChanged = (evt: InputEvent) => {
    const target = evt.target as HTMLInputElement;
    const file = target.files[0];
    if (file) {
      fileToUrl(file).then(url => {
          fabric.Image.fromURL(url, (img) => {
            const ratio = calculateRatio(img.width, img.height, canvas.width, canvas.height) * 0.25;
            img.set("top", 0);
            img.set("left", 0);
            img.set("scaleX", ratio);
            img.set("scaleY", ratio);
            if (ksignature) {
              canvas.remove(ksignature);
            }
            ksignature = img;
            canvas.add(img)
              .requestRenderAll();
          });
        })
    }
  };

  return (
    <>
      <Show when={!error() && !magickLoaded()}>
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </Show>

      <Show when={error()}>
        <div class="alert alert-warning" role="alert">
          Tải ứng dụng thất bại, vui lòng thử lại sau!
          <br />
          Mã lỗi: {error()}
        </div>
      </Show>

      <Show when={!error() && magickLoaded()}>
        <div class="editor">
          <canvas ref={canvasRef} id="canvas" class="border border-primary"></canvas>
        </div>
        <div class="form my-2 d-flex justify-content-between">
          <span>
            <label class="btn btn-primary p-2" for="image">Select Image</label>
            <input accept="image/*" class="d-none" id="image" type="file" onchange={handleImageChanged} />
          </span>
          <span>
            <label class="btn btn-primary p-2" for="signature">Select signature</label>
            <input accept="image/*" class="d-none" id="signature" type="file" onchange={handSignatureChanged} />
          </span>
        </div>
      </Show>
    </>
  )
}

export default App
