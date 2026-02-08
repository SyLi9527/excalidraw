import { RecorderController } from "../recording/RecorderController";

type Listener = (event?: any) => void;

class StubMediaRecorder {
  public state: "inactive" | "recording" | "paused" = "inactive";
  private listeners: Record<string, Listener[]> = {};

  addEventListener(type: string, listener: Listener) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners[type] = (this.listeners[type] || []).filter(
      (item) => item !== listener,
    );
  }

  start() {
    this.state = "recording";
  }

  pause() {
    this.state = "paused";
  }

  resume() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    const dataEvent = { data: new Blob(["chunk"], { type: "video/webm" }) };
    (this.listeners.dataavailable || []).forEach((cb) => cb(dataEvent));
    (this.listeners.stop || []).forEach((cb) => cb());
  }
}

describe("RecorderController", () => {
  const createController = () => {
    const stub = new StubMediaRecorder();
    const controller = new RecorderController({
      getStream: () => ({}) as MediaStream,
      createMediaRecorder: () => stub as unknown as MediaRecorder,
      mimeType: "video/webm",
    });
    return { controller, stub };
  };

  it("transitions through start, pause, resume, stop", async () => {
    const { controller } = createController();

    expect(controller.getState()).toBe("idle");

    await controller.start();
    expect(controller.getState()).toBe("recording");

    controller.pause();
    expect(controller.getState()).toBe("paused");

    controller.resume();
    expect(controller.getState()).toBe("recording");

    const result = await controller.stop();
    expect(result).toBeInstanceOf(Blob);
    expect(controller.getState()).toBe("stopped");
  });

  it("rejects invalid transitions", async () => {
    const { controller } = createController();

    expect(() => controller.pause()).toThrow();
    expect(() => controller.resume()).toThrow();
    await expect(controller.stop()).rejects.toThrow();

    await controller.start();
    await expect(controller.start()).rejects.toThrow();
  });
});
