"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export interface FirmaCanvasHandle {
  isEmpty: () => boolean;
  toBlob: () => Promise<Blob | null>;
  clear: () => void;
}

export const FirmaCanvas = forwardRef<FirmaCanvasHandle>(function FirmaCanvas(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disegnando = useRef(false);

  function posizioneEvento(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = posizioneEvento(e);
    disegnando.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvas.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!disegnando.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = posizioneEvento(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function handlePointerUp() {
    disegnando.current = false;
  }

  useImperativeHandle(
    ref,
    () => ({
      isEmpty: () => {
        const canvas = canvasRef.current;
        if (!canvas) return true;
        const ctx = canvas.getContext("2d");
        if (!ctx) return true;
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] !== 0) return false;
        }
        return true;
      },
      toBlob: () =>
        new Promise((resolve) => {
          const canvas = canvasRef.current;
          if (!canvas) {
            resolve(null);
            return;
          }
          canvas.toBlob((blob) => resolve(blob), "image/png");
        }),
      clear: () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      },
    }),
    []
  );

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={180}
      className="w-full touch-none rounded-lg border border-gray-300 bg-white"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
});
