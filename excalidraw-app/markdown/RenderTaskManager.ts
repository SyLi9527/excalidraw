export class RenderTaskManager {
  private controller = new AbortController();

  abort() {
    this.controller.abort();
    this.controller = new AbortController();
  }

  async enqueue<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const signal = this.controller.signal;
    return task(signal);
  }
}
