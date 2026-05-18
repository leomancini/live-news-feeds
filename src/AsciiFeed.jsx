import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import styled from "styled-components";

const ASCII_CHARS = " .:-=+*#%@";
const COLS = 140;
const CHAR_ASPECT = 0.55;

const Wrap = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #000;
`;

const HiddenVideo = styled.video`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
`;

const Canvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
`;

const Loading = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font: 14px Menlo, monospace;
  letter-spacing: 0.1em;
  pointer-events: none;
`;

export default function AsciiFeed({ streamUrl }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const sampleCanvasRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sampleCanvasRef.current = document.createElement("canvas");
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    let hls;
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
    }
    return () => hls?.destroy();
  }, [streamUrl]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const sampleCanvas = sampleCanvasRef.current;
    if (!canvas || !sampleCanvas) return;
    const ctx = canvas.getContext("2d");
    const sampleCtx = sampleCanvas.getContext("2d", {
      willReadFrequently: true
    });

    let frameId;
    let last = 0;
    const interval = 1000 / 15;

    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setupCanvas();
    const ro = new ResizeObserver(setupCanvas);
    ro.observe(canvas);

    const render = (t) => {
      frameId = requestAnimationFrame(render);
      if (t - last < interval) return;
      last = t;

      if (!video || video.readyState < 2 || !video.videoWidth) return;

      const rect = canvas.getBoundingClientRect();
      const charWidth = rect.width / COLS;
      const idealCharHeight = charWidth / CHAR_ASPECT;
      const rows = Math.max(1, Math.round(rect.height / idealCharHeight));
      const charHeight = rect.height / rows;

      sampleCanvas.width = COLS;
      sampleCanvas.height = rows;

      try {
        sampleCtx.drawImage(video, 0, 0, COLS, rows);
        const { data } = sampleCtx.getImageData(0, 0, COLS, rows);

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, rect.width, rect.height);

        ctx.font = `${charHeight * 1.05}px Menlo, monospace`;
        ctx.textBaseline = "top";

        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < COLS; x++) {
            const i = (y * COLS + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
            const charIdx = Math.floor(lum * (ASCII_CHARS.length - 1));
            const char = ASCII_CHARS[charIdx];
            if (char === " ") continue;
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillText(char, x * charWidth, y * charHeight);
          }
        }
        setLoading(false);
      } catch (err) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = "#f55";
        ctx.font = "14px Menlo, monospace";
        ctx.fillText("stream blocked: " + err.message, 12, 24);
      }
    };

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
    };
  }, []);

  return (
    <Wrap>
      <HiddenVideo
        ref={videoRef}
        autoPlay
        muted
        playsInline
        crossOrigin="anonymous"
      />
      <Canvas ref={canvasRef} />
      {loading && <Loading>LOADING…</Loading>}
    </Wrap>
  );
}
