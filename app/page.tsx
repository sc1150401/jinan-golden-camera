"use client";

import { Camera, Download, RefreshCw, Share2, Sparkles, SwitchCamera, Video as VideoIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Result = { url: string; blob: Blob; kind: "photo" | "video" } | null;
type GoldParticle = { x: number; y: number; r: number; drift: number; speed: number; phase: number; star: boolean };
const W = 1080;
const H = 1920;

function drawCover(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number) {
  const scale = Math.max(W / sw, H / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(source, (W - dw) / 2, (H - dh) / 2, dw, dh);
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

  const [started, setStarted] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [shareHint, setShareHint] = useState("");

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
      bg.addColorStop(0, "#f9f4e5"); bg.addColorStop(0.55, "#e9d7aa"); bg.addColorStop(1, "#172643");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    }

    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, "rgba(7,21,48,.28)"); shade.addColorStop(.28, "rgba(7,21,48,0)");
    shade.addColorStop(.72, "rgba(7,21,48,0)"); shade.addColorStop(1, "rgba(7,21,48,.68)");
    ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);

    const brand = brandRef.current;
    if (brand?.complete && brand.naturalWidth) {
      ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = .92;
      ctx.drawImage(brand, 744, 286, 510, 366, 430, 92, 570, 410); ctx.restore();
      ctx.save(); ctx.globalAlpha = .8; ctx.beginPath(); ctx.rect(0, 0, 232, H); ctx.clip();
      ctx.drawImage(brand, 0, 135, 620, 836, -350, -24, 780, H + 48); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = .8;
      ctx.drawImage(brand, 275, 870, 470, 102, 264, 1762, 552, 120); ctx.restore();
    }

    const t = now / 1000;
    for (let line = 0; line < 3; line += 1) {
      const offset = Math.sin(t * .36 + line * 1.3) * 20;
      const gradient = ctx.createLinearGradient(0, 0, W, 0);
      gradient.addColorStop(0, "rgba(188,151,76,0)"); gradient.addColorStop(.38, `rgba(245,218,150,${.22 + line * .05})`);
      gradient.addColorStop(.72, "rgba(255,244,205,.72)"); gradient.addColorStop(1, "rgba(188,151,76,0)");
      ctx.beginPath(); ctx.moveTo(-80, 1260 + line * 34);
      ctx.bezierCurveTo(240, 1060 + offset, 740, 1515 - offset, 1160, 1280 + line * 26);
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

    const bottomFade = ctx.createLinearGradient(0, 1520, 0, H);
    bottomFade.addColorStop(0, "rgba(9,25,53,0)"); bottomFade.addColorStop(1, "rgba(9,25,53,.82)");
    ctx.fillStyle = bottomFade; ctx.fillRect(0, 1500, W, 420);
    ctx.beginPath(); ctx.roundRect(58, 52, W - 116, H - 104, 50);
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
        video: { facingMode: { ideal: mode }, width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: false,
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

  const capturePhoto = async () => {
    if (!started || recording) return;
    for (let n = 3; n > 0; n -= 1) { setCountdown(n); await new Promise((resolve) => window.setTimeout(resolve, 700)); }
    setCountdown(null);
    canvasRef.current?.toBlob((blob) => {
      if (blob) setResult({ url: URL.createObjectURL(blob), blob, kind: "photo" });
    }, "image/png");
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

  const retake = () => {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setShareHint("");
  };
  const extension = result?.blob.type.includes("mp4") ? "mp4" : "webm";
  const filename = result?.kind === "photo" ? "2026金安獎_交通之光.png" : `2026金安獎_交通之光.${extension}`;

  const shareResult = async (target: "instagram" | "line") => {
    if (!result) return;
    const file = new File([result.blob], filename, { type: result.blob.type });
    const targetName = target === "instagram" ? "Instagram 限時動態" : "LINE";
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      setShareHint(`請在分享選單中選擇 ${targetName}`);
      try {
        await navigator.share({
          files: [file],
          title: "2026 金安獎｜金安無限・交通之光",
          text: target === "line" ? "2026 金安獎｜金安無限・交通之光" : undefined,
        });
        return;
      }
      catch (shareError) { if ((shareError as DOMException).name === "AbortError") return; }
    }
    const anchor = document.createElement("a"); anchor.href = result.url; anchor.download = filename; anchor.click();
    setShareHint(`檔案已下載，請開啟 ${targetName} 後上傳`);
  };

  return (
    <main className="camera-app">
      <video ref={videoRef} muted playsInline className="source-video" aria-hidden="true" />
      <section className="camera-shell" aria-label="2026 金安獎打卡相機">
        <header className="topbar">
          <div><p className="eyebrow">2026 SAFETY GOLD AWARD</p><h1>金安無限・交通之光</h1></div>
          {started && !result && <button className="icon-button" onClick={switchCamera} aria-label="切換前後鏡頭"><SwitchCamera size={23} /></button>}
        </header>
        <div className="stage">
          <canvas ref={canvasRef} width={W} height={H} />
          {!started && !result && <div className="welcome">
            <div className="welcome-mark"><Sparkles size={22} /></div><p>典雅金光打卡框</p>
            <button className="start-button" onClick={() => openCamera()}><Camera size={20} /> 開啟相機</button>
          </div>}
          {countdown !== null && <div className="countdown">{countdown}</div>}
          {recording && <div className="recording-badge"><span />錄製中<div className="record-track"><i style={{ width: `${recordProgress}%` }} /></div></div>}
          {result?.kind === "photo" && <img src={result.url} className="result-media" alt="金安獎打卡照片預覽" />}
          {result?.kind === "video" && <video src={result.url} className="result-media" autoPlay loop muted playsInline controls />}
        </div>
        {error && <p className="error-message" role="alert">{error}</p>}
        <footer className="controls">
          {started && !result && <>
            <button className="secondary-action" onClick={recordVideo} disabled={recording}><VideoIcon size={20} />{recording ? "錄製中" : "錄製 10 秒"}</button>
            <button className="shutter" onClick={capturePhoto} disabled={recording} aria-label="拍照"><span><Camera size={26} /></span></button>
            <span className="control-spacer" aria-hidden="true" />
          </>}
          {result && <>
            <div className="result-actions">
              <button className="platform-button instagram-button" onClick={() => shareResult("instagram")}>
                <span className="platform-mark">IG</span>
                <span>傳到 IG 限動</span>
              </button>
              <button className="platform-button line-button" onClick={() => shareResult("line")}>
                <span className="platform-mark">LINE</span>
                <span>傳到 LINE</span>
              </button>
              <button className="secondary-action" onClick={retake}><RefreshCw size={19} />重拍</button>
              <a className="secondary-action" href={result.url} download={filename}><Download size={19} />下載</a>
              {shareHint && <p className="share-hint"><Share2 size={15} />{shareHint}</p>}
            </div>
          </>}
        </footer>
      </section>
    </main>
  );
}
