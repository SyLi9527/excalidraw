import rough from "roughjs/bin/rough";

import { arrayToMap } from "@excalidraw/common";

import {
  getInitializedImageElements,
  isElementInViewport,
  updateImageCache,
} from "@excalidraw/element";

import type {
  ExcalidrawElement,
  NonDeletedSceneElementsMap,
} from "@excalidraw/element/types";

import { Fonts } from "@excalidraw/excalidraw/fonts";
import { renderStaticScene } from "@excalidraw/excalidraw/renderer/staticScene";

import type { RenderableElementsMap } from "@excalidraw/excalidraw/scene/types";
import type {
  AppClassProperties,
  AppState,
  BinaryFiles,
  StaticCanvasAppState,
} from "@excalidraw/excalidraw/types";

import { computeFitRect, computeOutputSize } from "./recordingLayout";

import type { RecordingSettings } from "./recordingSettings";
import type { RecordingBackgroundCategory } from "./backgrounds";

export type RecorderState = "idle" | "recording" | "paused" | "stopped";

type RecorderControllerOptions = {
  mimeType: string;
  getStream?: () => MediaStream;
  getAudioStream?: () => MediaStream | null;
  createMediaRecorder?: (
    stream: MediaStream,
    options?: MediaRecorderOptions,
  ) => MediaRecorder;
  fps?: number;
  getSceneElements?: () => readonly ExcalidrawElement[];
  getAppState?: () => AppState;
  getFiles?: () => BinaryFiles;
  getCursorPosition?: () => { x: number; y: number } | null;
  getCameraStream?: () => MediaStream | null;
  getSettings?: () => RecordingSettings;
  backgrounds?: RecordingBackgroundCategory[];
};

const DEFAULT_FPS = 30;

export class RecorderController {
  private state: RecorderState = "idle";
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stopPromise: Promise<Blob> | null = null;
  private resolveStop: ((value: Blob) => void) | null = null;
  private rejectStop: ((reason?: Error) => void) | null = null;
  private sceneCanvas: HTMLCanvasElement | null = null;
  private compositeCanvas: HTMLCanvasElement | null = null;
  private roughCanvas: ReturnType<typeof rough.canvas> | null = null;
  private animationFrameId: number | null = null;
  private imageCache: AppClassProperties["imageCache"] = new Map();
  private backgroundImages = new Map<string, HTMLImageElement>();
  private pendingImageUpdate: Promise<unknown> | null = null;
  private cameraVideo: HTMLVideoElement | null = null;

  constructor(private options: RecorderControllerOptions) {}

  getState(): RecorderState {
    return this.state;
  }

  async start() {
    if (this.state === "recording" || this.state === "paused") {
      return Promise.reject(new Error("Recorder is already running"));
    }

    this.resetRecorderState();

    const stream = await this.prepareStream();

    const createRecorder =
      this.options.createMediaRecorder ||
      ((streamTarget: MediaStream, mediaOptions?: MediaRecorderOptions) =>
        new MediaRecorder(streamTarget, mediaOptions));

    const recorder = createRecorder(stream, { mimeType: this.options.mimeType });
    this.mediaRecorder = recorder;

    recorder.addEventListener("dataavailable", (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    });

    recorder.addEventListener("stop", () => {
      const blob = new Blob(this.chunks, { type: this.options.mimeType });
      this.state = "stopped";
      this.stopRenderLoop();
      if (this.cameraVideo) {
        this.cameraVideo.pause();
      }
      if (this.resolveStop) {
        this.resolveStop(blob);
      }
      this.cleanupStopHandlers();
    });

    recorder.start();
    this.state = "recording";
  }

  pause() {
    if (this.state !== "recording" || !this.mediaRecorder) {
      throw new Error("Recorder is not recording");
    }
    this.mediaRecorder.pause();
    this.state = "paused";
  }

  resume() {
    if (this.state !== "paused" || !this.mediaRecorder) {
      throw new Error("Recorder is not paused");
    }
    this.mediaRecorder.resume();
    this.state = "recording";
  }

  stop(): Promise<Blob> {
    if (
      (this.state !== "recording" && this.state !== "paused") ||
      !this.mediaRecorder
    ) {
      return Promise.reject(new Error("Recorder is not active"));
    }

    if (!this.stopPromise) {
      this.stopPromise = new Promise<Blob>((resolve, reject) => {
        this.resolveStop = resolve;
        this.rejectStop = reject;
      });
    }

    const pendingStop = this.stopPromise;

    try {
      this.mediaRecorder.stop();
    } catch (error: any) {
      if (this.rejectStop) {
        this.rejectStop(error);
      }
      this.cleanupStopHandlers();
      return Promise.reject(error);
    }

    return pendingStop;
  }

  private async prepareStream(): Promise<MediaStream> {
    if (this.options.getStream) {
      const directStream = this.options.getStream();
      this.attachAudioTracks(directStream);
      return directStream;
    }

    const compositeCanvas = this.ensureCompositeCanvas();
    const fps = this.options.fps ?? DEFAULT_FPS;
    const stream = compositeCanvas.captureStream(fps);
    this.attachAudioTracks(stream);
    await this.prepareRenderingResources();
    this.startRenderLoop();
    return stream;
  }

  private attachAudioTracks(stream: MediaStream) {
    const audioStream = this.options.getAudioStream?.();
    if (audioStream) {
      audioStream
        .getAudioTracks()
        .forEach((track) => stream.addTrack(track));
    }
  }

  private async prepareRenderingResources() {
    if (!this.options.getSceneElements || !this.options.getAppState) {
      return;
    }

    const elements = this.options.getSceneElements();
    await Fonts.loadElementsFonts(elements);

    if (this.options.getFiles) {
      const files = this.options.getFiles();
      const imageElements = getInitializedImageElements(elements);
      const fileIds = imageElements.map((element) => element.fileId);
      if (fileIds.length > 0) {
        await updateImageCache({
          fileIds,
          files,
          imageCache: this.imageCache,
        });
      }
    }

    if (this.options.getCameraStream && !this.cameraVideo) {
      const cameraStream = this.options.getCameraStream();
      if (cameraStream) {
        const video = document.createElement("video");
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.srcObject = cameraStream;
        try {
          await video.play();
        } catch {
          // ignore play failures until user interacts
        }
        this.cameraVideo = video;
      }
    }
  }

  private ensureCompositeCanvas() {
    if (!this.compositeCanvas) {
      this.compositeCanvas = document.createElement("canvas");
    }

    const appState = this.options.getAppState?.();
    const settings = this.options.getSettings?.();
    if (appState && settings) {
      const outputSize = computeOutputSize(
        appState.width,
        appState.height,
        settings.aspectRatio,
      );
      this.compositeCanvas.width = outputSize.width;
      this.compositeCanvas.height = outputSize.height;
    }

    return this.compositeCanvas;
  }

  private ensureSceneCanvas(appState: AppState) {
    if (!this.sceneCanvas) {
      this.sceneCanvas = document.createElement("canvas");
    }

    if (
      this.sceneCanvas.width !== appState.width ||
      this.sceneCanvas.height !== appState.height
    ) {
      this.sceneCanvas.width = appState.width;
      this.sceneCanvas.height = appState.height;
    }

    if (!this.roughCanvas) {
      this.roughCanvas = rough.canvas(this.sceneCanvas);
    }
  }

  private startRenderLoop() {
    this.stopRenderLoop();
    const renderLoop = () => {
      this.renderFrame();
      this.animationFrameId = requestAnimationFrame(renderLoop);
    };
    this.animationFrameId = requestAnimationFrame(renderLoop);
  }

  private stopRenderLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private renderFrame() {
    if (!this.sceneCanvas || !this.compositeCanvas) {
      return;
    }

    const appState = this.options.getAppState?.();
    const elements = this.options.getSceneElements?.();
    const settings = this.options.getSettings?.();

    if (!appState || !elements) {
      return;
    }

    if (settings) {
      const outputSize = computeOutputSize(
        appState.width,
        appState.height,
        settings.aspectRatio,
      );
      if (
        this.compositeCanvas.width !== outputSize.width ||
        this.compositeCanvas.height !== outputSize.height
      ) {
        this.compositeCanvas.width = outputSize.width;
        this.compositeCanvas.height = outputSize.height;
      }
    }

    this.ensureSceneCanvas(appState);

    const elementsMap = arrayToMap(elements);
    const visibleElements = elements.filter((element) =>
      isElementInViewport(
        element,
        appState.width,
        appState.height,
        {
          zoom: appState.zoom,
          offsetLeft: appState.offsetLeft,
          offsetTop: appState.offsetTop,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
        },
        elementsMap,
      ),
    );

    if (this.options.getFiles) {
      this.updateImageCacheIfNeeded(elements, this.options.getFiles());
    }

    const sceneAppState: StaticCanvasAppState = {
      ...appState,
      viewBackgroundColor: "transparent",
    };

    renderStaticScene({
      canvas: this.sceneCanvas,
      rc: this.roughCanvas!,
      elementsMap: elementsMap as RenderableElementsMap,
      allElementsMap: elementsMap as NonDeletedSceneElementsMap,
      visibleElements,
      scale: 1,
      appState: sceneAppState,
      renderConfig: {
        canvasBackgroundColor: "transparent",
        imageCache: this.imageCache,
        renderGrid: appState.gridModeEnabled,
        isExporting: false,
        embedsValidationStatus: new Map(),
        elementsPendingErasure: new Set(),
        pendingFlowchartNodes: null,
        theme: appState.theme,
      },
    });

    const ctx = this.compositeCanvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, this.compositeCanvas.width, this.compositeCanvas.height);
    this.drawBackground(ctx, appState);

    const fitRect = computeFitRect(
      this.sceneCanvas.width,
      this.sceneCanvas.height,
      this.compositeCanvas.width,
      this.compositeCanvas.height,
    );

    ctx.drawImage(
      this.sceneCanvas,
      fitRect.x,
      fitRect.y,
      fitRect.width,
      fitRect.height,
    );

    this.drawCursorHighlight(ctx, fitRect);
    this.drawCameraPip(ctx);
  }

  private updateImageCacheIfNeeded(
    elements: readonly ExcalidrawElement[],
    files: BinaryFiles,
  ) {
    if (this.pendingImageUpdate) {
      return;
    }

    const imageElements = getInitializedImageElements(elements);
    const fileIds = imageElements
      .map((element) => element.fileId)
      .filter((fileId) => !this.imageCache.has(fileId));

    if (fileIds.length === 0) {
      return;
    }

    this.pendingImageUpdate = updateImageCache({
      fileIds,
      files,
      imageCache: this.imageCache,
    }).finally(() => {
      this.pendingImageUpdate = null;
    });
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    appState: AppState,
  ) {
    const settings = this.options.getSettings?.();
    if (!settings) {
      ctx.fillStyle = appState.viewBackgroundColor;
      ctx.fillRect(0, 0, this.compositeCanvas!.width, this.compositeCanvas!.height);
      return;
    }

    const option = this.findBackgroundOption(settings);
    if (option?.color) {
      ctx.fillStyle = option.color;
      ctx.fillRect(0, 0, this.compositeCanvas!.width, this.compositeCanvas!.height);
      return;
    }

    if (option?.previewUrl) {
      const image = this.loadBackgroundImage(option.previewUrl);
      if (image.complete) {
        ctx.drawImage(
          image,
          0,
          0,
          this.compositeCanvas!.width,
          this.compositeCanvas!.height,
        );
        return;
      }
    }

    ctx.fillStyle = appState.viewBackgroundColor;
    ctx.fillRect(0, 0, this.compositeCanvas!.width, this.compositeCanvas!.height);
  }

  private loadBackgroundImage(url: string) {
    if (this.backgroundImages.has(url)) {
      return this.backgroundImages.get(url)!;
    }
    const image = new Image();
    image.src = url;
    this.backgroundImages.set(url, image);
    return image;
  }

  private findBackgroundOption(settings: RecordingSettings) {
    const backgrounds = this.options.backgrounds ?? [];
    const category = backgrounds.find(
      (item) => item.id === settings.background.category,
    );
    return category?.options.find(
      (option) => option.id === settings.background.id,
    );
  }

  private drawCursorHighlight(
    ctx: CanvasRenderingContext2D,
    fitRect: { x: number; y: number; scale: number },
  ) {
    const settings = this.options.getSettings?.();
    if (!settings?.cursorHighlight) {
      return;
    }
    const cursor = this.options.getCursorPosition?.();
    if (!cursor) {
      return;
    }
    const radius = 10 * fitRect.scale;
    const x = fitRect.x + cursor.x * fitRect.scale;
    const y = fitRect.y + cursor.y * fitRect.scale;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 80, 80, 0.9)";
    ctx.lineWidth = 2 * fitRect.scale;
    ctx.stroke();
    ctx.restore();
  }

  private drawCameraPip(ctx: CanvasRenderingContext2D) {
    const settings = this.options.getSettings?.();
    if (!settings?.cameraEnabled || !this.cameraVideo) {
      return;
    }
    if (this.cameraVideo.readyState < 2) {
      return;
    }

    const pip = settings.pip;
    const width = this.compositeCanvas!.width * pip.width;
    const height = this.compositeCanvas!.height * pip.height;
    const x = this.compositeCanvas!.width * pip.x;
    const y = this.compositeCanvas!.height * pip.y;

    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, width, height, 12);
    } else {
      ctx.rect(x, y, width, height);
    }
    ctx.clip();
    ctx.drawImage(this.cameraVideo, x, y, width, height);
    ctx.restore();
  }

  private resetRecorderState() {
    this.chunks = [];
    this.stopPromise = null;
    this.resolveStop = null;
    this.rejectStop = null;
  }

  private cleanupStopHandlers() {
    this.stopPromise = null;
    this.resolveStop = null;
    this.rejectStop = null;
  }
}
