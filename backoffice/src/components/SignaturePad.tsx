"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui";

export function SignaturePad({ name }: { name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.strokeStyle = "#0b0d12";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
    }
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    const pos = getPos(e);
    ctx?.beginPath();
    ctx?.moveTo(pos.x, pos.y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const pos = getPos(e);
    ctx?.lineTo(pos.x, pos.y);
    ctx?.stroke();
    setHasDrawn(true);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (hiddenInputRef.current && canvasRef.current) {
      hiddenInputRef.current.value = canvasRef.current.toDataURL("image/png");
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (hiddenInputRef.current) hiddenInputRef.current.value = "";
    setHasDrawn(false);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full h-40 rounded-md border border-line bg-surface touch-none"
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-ink-faint">Le client signe directement dans ce cadre.</p>
        <Button type="button" variant="outline" onClick={clear} disabled={!hasDrawn}>
          Effacer
        </Button>
      </div>
      <input ref={hiddenInputRef} type="hidden" name={name} />
    </div>
  );
}
