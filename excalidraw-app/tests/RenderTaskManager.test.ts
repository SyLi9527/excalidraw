import { describe, expect, it } from "vitest";
import { RenderTaskManager } from "../markdown/RenderTaskManager";

describe("RenderTaskManager", () => {
  it("aborts previous tasks", async () => {
    const manager = new RenderTaskManager();
    const calls: string[] = [];

    const first = manager.enqueue(async (signal) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (!signal.aborted) calls.push("first");
    });

    manager.abort();

    await first;
    expect(calls).toEqual([]);
  });
});
