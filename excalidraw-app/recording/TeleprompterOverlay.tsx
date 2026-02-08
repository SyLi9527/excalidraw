import React, { useEffect, useRef, useState } from "react";

import "./RecordingDialog.scss";

export const TeleprompterOverlay = ({
  enabled,
  text,
  opacity,
  speed,
  onTextChange,
  onOpacityChange,
  onSpeedChange,
}: {
  enabled: boolean;
  text: string;
  opacity: number;
  speed: number;
  onTextChange: (text: string) => void;
  onOpacityChange: (opacity: number) => void;
  onSpeedChange: (speed: number) => void;
}) => {
  const HANDLE_LABEL = "Move teleprompter";
  const NUDGE = 10;
  const scrollRef = useRef<HTMLTextAreaElement>(null);
  const [position, setPosition] = useState({ x: 24, y: 80 });
  const dragState = useRef<{ offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || speed <= 0) {
      return;
    }

    let frame = 0;
    let lastTime = performance.now();

    const tick = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      if (scrollRef.current) {
        scrollRef.current.scrollTop += (speed * delta) / 1000;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [enabled, speed]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragState.current) {
        return;
      }
      setPosition({
        x: event.clientX - dragState.current.offsetX,
        y: event.clientY - dragState.current.offsetY,
      });
    };

    const handleUp = () => {
      dragState.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    let dx = 0;
    let dy = 0;
    const step = event.shiftKey ? NUDGE * 2 : NUDGE;

    if (event.key === "ArrowUp") {
      dy = -step;
    }
    if (event.key === "ArrowDown") {
      dy = step;
    }
    if (event.key === "ArrowLeft") {
      dx = -step;
    }
    if (event.key === "ArrowRight") {
      dx = step;
    }

    if (dx || dy) {
      event.preventDefault();
      setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  return (
    <div
      className="TeleprompterOverlay"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        opacity,
      }}
    >
      <div
        className="TeleprompterOverlay__header"
      >
        <button
          type="button"
          className="TeleprompterOverlay__dragHandle"
          aria-label={HANDLE_LABEL}
          onPointerDown={(event) => {
            dragState.current = {
              offsetX: event.clientX - position.x,
              offsetY: event.clientY - position.y,
            };
          }}
          onKeyDown={handleKeyDown}
        >
          Move
        </button>
        <span className="TeleprompterOverlay__title">Teleprompter</span>
        <div className="TeleprompterOverlay__controls">
          <label className="TeleprompterOverlay__control">
            Speed
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={speed}
              onChange={(event) =>
                onSpeedChange(Number(event.currentTarget.value))
              }
            />
          </label>
          <label className="TeleprompterOverlay__control">
            Opacity
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(event) =>
                onOpacityChange(Number(event.currentTarget.value))
              }
            />
          </label>
        </div>
      </div>
      <div className="TeleprompterOverlay__body">
        <textarea
          className="TeleprompterOverlay__textarea"
          name="teleprompterText"
          autoComplete="off"
          value={text}
          onChange={(event) => onTextChange(event.currentTarget.value)}
          aria-label="Teleprompter text"
          ref={scrollRef}
        />
      </div>
    </div>
  );
};
