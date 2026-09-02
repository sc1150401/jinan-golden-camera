"use client";

import { Camera, Download, RefreshCw, Sparkles, SwitchCamera, Video as VideoIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Result = { url: string; blob: Blob; kind: "photo" | "video" } | null;
type CapturedPhoto = { url: string; blob: Blob; previewUrl?: string };
type GoldParticle = { x: number; y: number; r: number; drift: number; speed: number; phase: number; star: boolean };
const W = 1280;
const H = 720;
const OUTPUT_W = 1080;
const OUTPUT_H = 1920;
// The live crop and each saved panel intentionally share the same 16:9 geometry.

function drawCover(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number) {
  const scale = Math.max(W / sw, H / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(source, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

function drawCoverInRect(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function canvasBlob(canvas: HTMLCanvasElement, type = "image/png") {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("無法建立照片")), type));
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("無法讀取照片"));
    image.src = url;
  });
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const brandRef = useRef<HTMLImageElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const particlesRef = useRef<GoldParticle[]>([]);
  const resultRef = useRef<Result>(null);
  const shotsRef = useRef<CapturedPhoto[]>([]);

  const [started, setStarted] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [shots, setShots] = useState<CapturedPhoto[]>([]);
  const [reviewingFirst, setReviewingFirst] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => { resultRef.current = result; }, [result]);

  useEffect(() => {
    const image = new Image();
    image.src = "/brand-board.png";
    brandRef.current = image;
    particlesRef.current = Array.from({ length: 44 }, (_, index) => ({
      x: Math.random(), y: Math.random(),
      r: index % 8 === 0 ? 3.5 + Math.random() * 2.5 : 1.2 + Math.random() * 2.4,
      drift: 0.012 + Math.random() * 0.024,
      speed: 0.008 + Math.random() * 0.018,
      phase: Math.random() * Math.PI * 2,
      star: index % 8 === 0,
    }));
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      shotsRef.current.forEach((shot) => { URL.revokeObjectURL(shot.url); if (shot.previewUrl) URL.revokeObjectURL(shot.previewUrl); });
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
    };
  }, []);

  const renderFrame = useCallback((now = performance.now()) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, W, H);

    if (video && video.readyState >= 2 && video.videoWidth) {
      ctx.save();
      if (facing === "user") { ctx.translate(W, 0); ctx.scale(-1, 1); }
      drawCover(ctx, video, video.videoWidth, video.videoHeight);
      ctx.restore();
    } else {
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#f9f4e5"); bg.addColorStop(.55, "#e9d7aa"); bg.addColorStop(1, "#172643");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    }

    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, "rgba(7,21,48,.28)"); shade.addColorStop(.28, "rgba(7,21,48,0)");
    shade.addColorStop(.72, "rgba(7,21,48,0)"); shade.addColorStop(1, "rgba(7,21,48,.68)");
    ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);

    const brand = brandRef.current;
    if (brand?.complete && brand.naturalWidth) {
      ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = .92;
      ctx.drawImage(brand, 744, 286, 510, 366, 735, 18, 500, 359); ctx.restore();
      ctx.save(); ctx.globalAlpha = .76; ctx.beginPath(); ctx.rect(0, 0, 180, H); ctx.clip();
      ctx.drawImage(brand, 0, 135, 620, 836, -285, -12, 650, H + 24); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = .8;
      ctx.drawImage(brand, 275, 870, 470, 102, 430, H - 98, 420, 91); ctx.restore();
    }

    const t = now / 1000;
    for (let line = 0; line < 3; line += 1) {
      const offset = Math.sin(t * .36 + line * 1.3) * 20;
      const gradient = ctx.createLinearGradient(0, 0, W, 0);
      gradient.addColorStop(0, "rgba(188,151,76,0)"); gradient.addColorStop(.38, `rgba(245,218,150,${.22 + line * .05})`);
      gradient.addColorStop(.72, "rgba(255,244,205,.72)"); gradient.addColorStop(1, "rgba(188,151,76,0)");
      ctx.beginPath(); ctx.moveTo(-80, 480 + line * 18);
      ctx.bezierCurveTo(300, 390 + offset, 860, 650 - offset, 1360, 490 + line * 18);
      ctx.strokeStyle = gradient; ctx.lineWidth = 2.2 - line * .4; ctx.stroke();
    }

    for (const p of particlesRef.current) {
      const y = ((p.y - t * p.speed + 4) % 1) * H;
      const x = (p.x + Math.sin(t * .38 + p.phase) * p.drift) * W;
      const pulse = .42 + Math.sin(t * 1.1 + p.phase) * .25;
      ctx.save(); ctx.translate(x, y); ctx.shadowColor = "rgba(255,225,153,.9)"; ctx.shadowBlur = p.star ? 18 : 10;
      ctx.strokeStyle = `rgba(255,236,184,${Math.max(.18, pulse)})`; ctx.fillStyle = `rgba(242,207,126,${Math.max(.2, pulse)})`;
      if (p.star) {
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-p.r * 4, 0); ctx.lineTo(p.r * 4, 0);
        ctx.moveTo(0, -p.r * 4); ctx.lineTo(0, p.r * 4); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    const bottomFade = ctx.createLinearGradient(0, H - 190, 0, H);
    bottomFade.addColorStop(0, "rgba(9,25,53,0)"); bottomFade.addColorStop(1, "rgba(9,25,53,.82)");
    ctx.fillStyle = bottomFade; ctx.fillRect(0, H - 210, W, 210);
    ctx.beginPath(); ctx.roundRect(28, 24, W - 56, H - 48, 28);
    ctx.strokeStyle = "rgba(222,191,121,.82)"; ctx.lineWidth = 2; ctx.stroke();
    animationRef.current = requestAnimationFrame(renderFrame);
  }, [facing]);

  useEffect(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(renderFrame);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [renderFrame]);

  const openCamera = async (mode = facing) => {
    setError("");
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 }, aspectRatio: { ideal: 16 / 9 } }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setStarted(true);
    } catch { setError("無法開啟相機，請在瀏覽器設定中允許使用相機後再試一次。"); }
  };

  const switchCamera = async () => {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next); await openCamera(next);
  };

  const takeRawPhoto = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) throw new Error("相機尚未準備完成");
    const snapshot = document.createElement("canvas");
    snapshot.width = W; snapshot.height = H;
    const ctx = snapshot.getContext("2d");
    if (!ctx) throw new Error("無法建立照片");
    ctx.save();
    if (facing === "user") { ctx.translate(W, 0); ctx.scale(-1, 1); }
    drawCover(ctx, video, video.videoWidth, video.videoHeight);
    ctx.restore();
    return canvasBlob(snapshot);
  };

  const drawPhotoPanel = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, y: number, label: string) => {
    const x = 40; const panelW = 1000; const panelH = 562.5;
    ctx.save();
    ctx.shadowColor = "rgba(5,17,38,.28)"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
    ctx.fillStyle = "#fffdf8"; ctx.fillRect(x - 10, y - 10, panelW + 20, panelH + 20);
    ctx.shadowColor = "transparent";
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, panelW, panelH); ctx.clip();
    drawCoverInRect(ctx, image, x, y, panelW, panelH);
    ctx.restore();
    ctx.strokeStyle = "rgba(190,145,61,.95)"; ctx.lineWidth = 8; ctx.strokeRect(x - 4, y - 4, panelW + 8, panelH + 8);
    ctx.fillStyle = "rgba(9,25,53,.72)"; ctx.fillRect(x + 18, y + 18, 148, 48);
    ctx.fillStyle = "#f5dfaa"; ctx.font = "600 22px Georgia, serif"; ctx.textAlign = "center";
    ctx.fillText(label, x + 92, y + 50);
    ctx.restore();
  };

  const composeCollage = async (items: CapturedPhoto[]) => {
    const collage = document.createElement("canvas"); collage.width = OUTPUT_W; collage.height = OUTPUT_H;
    const ctx = collage.getContext("2d");
    if (!ctx) throw new Error("無法建立拍貼");
    const [first, second] = await Promise.all(items.map((item) => loadImage(item.url)));
    const bg = ctx.createLinearGradient(0, 0, OUTPUT_W, OUTPUT_H);
    bg.addColorStop(0, "#fbf7ec"); bg.addColorStop(.62, "#efe0b9"); bg.addColorStop(1, "#caa65d");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, OUTPUT_W, OUTPUT_H);

    const brand = brandRef.current;
    if (brand?.complete && brand.naturalWidth) {
      ctx.save(); ctx.globalAlpha = .2; ctx.drawImage(brand, 0, 135, 620, 836, -310, 1210, 720, 970); ctx.restore();
      ctx.save(); ctx.translate(OUTPUT_W, 0); ctx.scale(-1, 1); ctx.globalAlpha = .14;
      ctx.drawImage(brand, 0, 135, 620, 836, -310, 1210, 720, 970); ctx.restore();
    }

    ctx.fillStyle = "#10213e"; ctx.font = "600 46px Georgia, 'Noto Serif TC', serif"; ctx.textAlign = "center";
    ctx.fillText("2026 金安獎・交通之光", OUTPUT_W / 2, 112);
    drawPhotoPanel(ctx, first, 185, "PHOTO 01");
    drawPhotoPanel(ctx, second, 747.5, "PHOTO 02");

    if (brand?.complete && brand.naturalWidth) {
      ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = .86;
      ctx.drawImage(brand, 744, 286, 510, 366, 435, 1370, 560, 402);
      ctx.drawImage(brand, 275, 870, 470, 102, 264, 1790, 552, 120); ctx.restore();
    }
    ctx.beginPath(); ctx.roundRect(30, 25, OUTPUT_W - 60, OUTPUT_H - 50, 34); ctx.strokeStyle = "rgba(172,126,45,.72)"; ctx.lineWidth = 3; ctx.stroke();
    return canvasBlob(collage);
  };

  const recordAnonymousUse = async () => {
    try {
      let deviceId = localStorage.getItem("jinan-anonymous-device");
      if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem("jinan-anonymous-device", deviceId); }
      await fetch("/api/usage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deviceId }), keepalive: true });
    } catch { /* Statistics must never block the camera experience. */ }
  };

  const capturePhoto = async () => {
    if (!started || recording || capturing) return;
    setCapturing(true); setError("");
    try {
      for (let n = 3; n > 0; n -= 1) { setCountdown(n); await new Promise((resolve) => window.setTimeout(resolve, 700)); }
      setCountdown(null);
      if (!canvasRef.current) throw new Error("無法建立照片");
      const blob = await canvasBlob(canvasRef.current);
      setResult({ url: URL.createObjectURL(blob), blob, kind: "photo" });
      void recordAnonymousUse();
    } catch (cause) {
      setCountdown(null); setError(cause instanceof Error ? cause.message : "拍照失敗，請再試一次。");
    } finally { setCapturing(false); }
  };

  const recordVideo = () => {
    const canvas = canvasRef.current;
    if (!canvas || recording || !canvas.captureStream) { setError("這個瀏覽器暫不支援錄影，可以使用拍照功能。"); return; }
    const stream = canvas.captureStream(30);
    const preferred = ["video/mp4;codecs=h264", "video/webm;codecs=vp9", "video/webm"];
    const mimeType = preferred.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        setResult({ url: URL.createObjectURL(blob), blob, kind: "video" }); setRecording(false); setRecordProgress(0);
      };
      recorder.start(250); setRecording(true);
      const startedAt = performance.now();
      const tick = () => {
        const elapsed = performance.now() - startedAt; setRecordProgress(Math.min(100, elapsed / 100));
        if (elapsed < 10000 && recorder.state === "recording") requestAnimationFrame(tick);
        else if (recorder.state === "recording") recorder.stop();
      };
      requestAnimationFrame(tick);
    } catch { setError("這個瀏覽器暫不支援錄影，可以使用拍照功能。"); }
  };

  const resetSession = () => {
    shotsRef.current.forEach((shot) => { URL.revokeObjectURL(shot.url); if (shot.previewUrl) URL.revokeObjectURL(shot.previewUrl); }); shotsRef.current = []; setShots([]);
    if (result) URL.revokeObjectURL(result.url);
    setResult(null); setReviewingFirst(false); setError("");
  };

  const retakeFirst = () => {
    shotsRef.current.forEach((shot) => { URL.revokeObjectURL(shot.url); if (shot.previewUrl) URL.revokeObjectURL(shot.previewUrl); }); shotsRef.current = []; setShots([]); setReviewingFirst(false);
  };

  const extension = result?.blob.type.includes("mp4") ? "mp4" : "webm";
  const filename = result?.kind === "photo" ? "2026金安獎_交通之光.png" : `2026金安獎_交通之光.${extension}`;
  const isLive = started && !result && !reviewingFirst;

  return (
    <main className="camera-app">
      <video ref={videoRef} muted playsInline className="source-video" aria-hidden="true" />
      <section className="camera-shell" aria-label="2026 金安獎雙照片拍貼相機">
        <header className="topbar">
          <div><p className="eyebrow">2026 SAFETY GOLD AWARD</p><h1>金安無限・交通之光</h1></div>
          {isLive && <button className="icon-button" onClick={switchCamera} aria-label="切換前後鏡頭"><SwitchCamera size={23} /></button>}
        </header>
        <div className="stage">
          <canvas ref={canvasRef} width={W} height={H} />
          {!started && !result && <div className="welcome">
            <div className="welcome-mark"><Sparkles size={22} /></div><p>雙照片金光拍貼</p>
            <button className="start-button" onClick={() => openCamera()}><Camera size={20} /> 開啟相機</button>
          </div>}
          {countdown !== null && <div className="countdown">{countdown}</div>}
          {isLive && countdown === null && !recording && <div className="shot-badge">單張拍照</div>}
          {recording && <div className="recording-badge"><span />錄製中<div className="record-track"><i style={{ width: `${recordProgress}%` }} /></div></div>}
          {result?.kind === "photo" && <img src={result.url} className="result-media" alt="金安獎雙照片拍貼預覽" />}
          {result?.kind === "video" && <video src={result.url} className="result-media" autoPlay loop muted playsInline controls />}
        </div>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="controls-area">
          <footer className="controls">
            {isLive && <>
              <button className="secondary-action" onClick={recordVideo} disabled={recording || capturing}><VideoIcon size={20} />{recording ? "錄製中" : "錄製 10 秒"}</button>
              <button className="shutter" onClick={capturePhoto} disabled={recording || capturing} aria-label={`拍第 ${shots.length + 1} 張照片`}><span><Camera size={26} /></span></button>
              <span className="control-spacer" aria-hidden="true" />
            </>}
            {result && <>
              <button className="secondary-action" onClick={resetSession}><RefreshCw size={19} />重新拍攝</button>
              <a className="secondary-action" href={result.url} download={filename}><Download size={19} />下載拍貼</a>
            </>}
          </footer>
          <p className="privacy-note">照片只在你的手機合成，不會上傳或保存。</p>
        </div>
      </section>
    </main>
  );
}
