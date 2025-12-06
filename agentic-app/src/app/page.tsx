"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SceneRecipe, SceneElement } from "@/types/scene";

const DEFAULT_PROMPT =
  "A neon-soaked alley caught between rain and holograms, with drones weaving through floating lanterns.";

const HERO_PROMPTS = [
  "Immersive coral metropolis where bioluminescent statues awaken under tidal moonlight.",
  "Mythic desert caravan traversing mirrored dunes during an electric aurora storm.",
  "Aerial night run across hyper-loop railways in a floating megacity above the clouds.",
];

const formatFloat = (value: number) => value.toFixed(1).replace(/\.0$/, "");

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

interface DrawContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

function getActiveBeat(recipe: SceneRecipe, progress: number) {
  if (!recipe.story.length) {
    return null;
  }

  for (let i = recipe.story.length - 1; i >= 0; i -= 1) {
    if (progress >= recipe.story[i].at) {
      return recipe.story[i];
    }
  }

  return recipe.story[0];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function drawShape(
  { ctx }: DrawContext,
  element: SceneElement,
  x: number,
  y: number,
  size: number,
  rotation: number,
  opacity: number,
  oscillation: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;
  ctx.shadowColor = element.color;
  ctx.shadowBlur = 60 * element.glow * clamp(oscillation, 0.2, 1.4);
  ctx.fillStyle = element.color;

  const softGradient = ctx.createRadialGradient(0, 0, size * 0.1, 0, 0, size);
  softGradient.addColorStop(0, `${element.color}cc`);
  softGradient.addColorStop(0.6, `${element.color}99`);
  softGradient.addColorStop(1, `${element.color}00`);

  ctx.fillStyle = softGradient;

  switch (element.shape) {
    case "orb": {
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "polygon": {
      const sides = 5 + Math.floor(element.density * 2);
      ctx.beginPath();
      for (let i = 0; i < sides; i += 1) {
        const angle = (i / sides) * Math.PI * 2;
        const radius = size * (0.75 + Math.sin(oscillation + i) * 0.18);
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "beam": {
      const beamWidth = size * 0.45;
      const beamLength = size * 3.4;
      ctx.beginPath();
      ctx.moveTo(-beamWidth, -beamLength * 0.5);
      ctx.quadraticCurveTo(0, -beamLength * 0.62, beamWidth, -beamLength * 0.5);
      ctx.lineTo(beamWidth, beamLength * 0.5);
      ctx.quadraticCurveTo(0, beamLength * 0.52, -beamWidth, beamLength * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "ribbon": {
      const ribbonWidth = size * 0.7;
      const ribbonLength = size * 2.6;
      ctx.beginPath();
      ctx.moveTo(-ribbonWidth, -ribbonLength * 0.5);
      for (let i = 0; i <= 16; i += 1) {
        const t = i / 16;
        const sway = Math.sin(oscillation * 2 + t * Math.PI * 4) * ribbonWidth;
        const yPos = -ribbonLength * 0.5 + ribbonLength * t;
        ctx.lineTo(sway, yPos);
      }
      ctx.lineTo(ribbonWidth, ribbonLength * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "flare": {
      ctx.beginPath();
      for (let i = 0; i < 12; i += 1) {
        const angle = (i / 12) * Math.PI * 2;
        const radius = size * (i % 2 === 0 ? 1.4 : 0.5);
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "particle":
    default: {
      const scatterCount = 14 + Math.floor(element.density * 10);
      for (let i = 0; i < scatterCount; i += 1) {
        const angle = (i / scatterCount) * Math.PI * 2 + oscillation * 0.3;
        const radius = size * 0.3 + (size * 0.7 * i) / scatterCount;
        ctx.beginPath();
        ctx.arc(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          size * 0.12,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      break;
    }
  }

  ctx.restore();
}

function computePosition(
  element: SceneElement,
  progress: number,
  { width, height }: DrawContext,
) {
  const angle = progress * Math.PI * 2 * element.pathFrequency + element.pathPhase;
  const amplitude = element.pathAmplitude;
  const layerBias = (element.layer - 1.5) * 80;
  const baseX = width / 2;
  const baseY = height / 2;

  switch (element.motion) {
    case "orbit":
      return {
        x: baseX + Math.cos(angle) * amplitude,
        y: baseY + Math.sin(angle * 0.8) * amplitude * 0.6 + layerBias,
      };
    case "wave":
      return {
        x:
          baseX +
          Math.sin(angle) * amplitude * 0.6 +
          (progress - 0.5) * width * 0.45,
        y:
          baseY +
          Math.cos(angle * 1.2) * amplitude * 0.2 +
          Math.sin(progress * Math.PI * 4) * 120 +
          layerBias,
      };
    case "burst":
      return {
        x: baseX + Math.cos(angle * 1.4) * (progress * amplitude * 1.1),
        y: baseY + Math.sin(angle * 1.4) * (progress * amplitude * 0.9) + layerBias,
      };
    case "spiral":
      return {
        x:
          baseX +
          Math.cos(angle) * (amplitude * progress * 1.4 + layerBias * 0.4),
        y:
          baseY +
          Math.sin(angle) * (amplitude * progress * 1.4 + layerBias * 0.4),
      };
    case "pulse":
      return {
        x:
          baseX +
          Math.cos(angle * 1.2) * (Math.sin(progress * Math.PI * 2) * amplitude),
        y:
          baseY +
          Math.sin(angle * 1.4) * (Math.sin(progress * Math.PI * 2) * amplitude) +
          layerBias,
      };
    case "drift":
    default:
      return {
        x:
          baseX +
          Math.cos(angle * 0.6 + element.layer) * (amplitude * 0.5) +
          Math.sin(progress * Math.PI * 2) * 120,
        y:
          baseY +
          Math.sin(angle * 0.9 + element.layer) * (amplitude * 0.4) +
          Math.cos(progress * Math.PI * 3) * 100 +
          layerBias,
      };
  }
}

function drawFrame(
  drawContext: DrawContext,
  recipe: SceneRecipe,
  frame: number,
  totalFrames: number,
) {
  const { ctx, width, height } = drawContext;
  const progress = frame / Math.max(totalFrames - 1, 1);
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = recipe.background;
  ctx.fillRect(0, 0, width, height);

  const cameraRoll =
    recipe.camera.roll *
    Math.sin(progress * Math.PI * 2 * 1.2 + frame * 0.01) *
    0.6;
  const panX = Math.sin(progress * Math.PI * 2) * recipe.camera.panStrength * 160;
  const panY =
    Math.cos(progress * Math.PI * 2.2) * recipe.camera.panStrength * 95 +
    Math.sin(frame * 0.06) * recipe.camera.shake * 12;

  ctx.translate(width / 2, height / 2);
  ctx.scale(recipe.camera.zoom, recipe.camera.zoom);
  ctx.rotate(cameraRoll);
  ctx.translate(-width / 2 + panX, -height / 2 + panY);

  const glowOverlay = ctx.createLinearGradient(0, 0, width, height);
  glowOverlay.addColorStop(0, "rgba(255,255,255,0.08)");
  glowOverlay.addColorStop(0.6, "rgba(255,255,255,0.02)");
  glowOverlay.addColorStop(1, "rgba(0,0,0,0.3)");

  recipe.elements.forEach((element) => {
    const pos = computePosition(element, progress, drawContext);
    const baseSize = element.size * 110 + element.layer * 18;
    const rotation = progress * Math.PI * 2 * (0.2 + element.density * 0.6);
    const opacity =
      0.38 +
      element.glow * 0.5 +
      Math.sin(progress * Math.PI * 4 + element.layer) * 0.2;
    const oscillation = Math.sin(frame * 0.03 + element.layer * 0.5) * 1.8;

    drawShape(
      drawContext,
      element,
      pos.x,
      pos.y,
      baseSize,
      rotation,
      clamp(opacity, 0.15, 0.95),
      oscillation,
    );
  });

  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = glowOverlay;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const beat = getActiveBeat(recipe, progress);
  if (beat) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const ambientGradient = ctx.createLinearGradient(0, height - 180, 0, height);
    ambientGradient.addColorStop(0, "rgba(0,0,0,0)");
    ambientGradient.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = ambientGradient;
    ctx.fillRect(0, height - 180, width, 180);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "24px var(--font-geist-sans, 'Geist', 'Inter', sans-serif)";
    ctx.fillText(beat.title, 48, height - 110);

    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "18px var(--font-geist-sans, 'Geist', 'Inter', sans-serif)";

    const words = beat.description.split(" ");
    let line = "";
    let y = height - 78;
    words.forEach((word) => {
      const testLine = `${line}${word} `;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > width - 96) {
        ctx.fillText(line.trim(), 48, y);
        line = `${word} `;
        y += 24;
      } else {
        line = testLine;
      }
    });
    if (line.trim()) {
      ctx.fillText(line.trim(), 48, y);
    }
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  ctx.restore();
}

function pickMimeType() {
  if (typeof window === "undefined") return "video/webm";
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm;codecs=daala",
    "video/webm",
    "video/mp4",
  ];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "video/webm";
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bootRef = useRef(false);

  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [recipe, setRecipe] = useState<SceneRecipe | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [renderProgress, setRenderProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const canvasDimensions = useMemo(
    () => ({ width: 960, height: 540 }),
    [],
  );

  const triggerRender = useCallback(
    async (currentRecipe: SceneRecipe) => {
      if (!canvasRef.current) {
        return;
      }

      setIsRendering(true);
      setStatusMessage("Translating latent scene into frames…");
      setRenderProgress(0);
      setVideoUrl(null);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        setError("Canvas rendering context unavailable in this browser.");
        setIsRendering(false);
        return;
      }

      canvas.width = canvasDimensions.width;
      canvas.height = canvasDimensions.height;

      const totalFrames = Math.floor(currentRecipe.duration * currentRecipe.fps);
      const mimeType = pickMimeType();
      const stream = canvas.captureStream(currentRecipe.fps);
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 4_000_000,
        });
      } catch (recorderError) {
        console.error(recorderError);
        setError(
          "MediaRecorder is unavailable. Try switching to Chrome or Edge desktop.",
        );
        setIsRendering(false);
        return;
      }
      const recordedChunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      const recordingComplete = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          resolve(new Blob(recordedChunks, { type: mimeType }));
        };
      });

      mediaRecorder.start(0);

      const frameDuration = 1000 / currentRecipe.fps;
      const drawContext: DrawContext = {
        ctx,
        width: canvas.width,
        height: canvas.height,
      };

      try {
        for (let frame = 0; frame < totalFrames; frame += 1) {
          drawFrame(drawContext, currentRecipe, frame, totalFrames);
          if (frame % Math.max(1, Math.floor(totalFrames / 24)) === 0) {
            setRenderProgress(Math.round((frame / totalFrames) * 100));
          }
          await wait(frameDuration);
        }
      } catch (renderError) {
        console.error(renderError);
        setError(
          "Rendering pipeline faulted while drawing the scene. Refresh and retry.",
        );
      }

      mediaRecorder.stop();
      const blob = await recordingComplete;
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setRenderProgress(100);
      setStatusMessage("Scene stabilized. Playback ready.");
      setIsRendering(false);
    },
    [canvasDimensions.height, canvasDimensions.width],
  );

  const requestScene = useCallback(
    async (nextPrompt: string) => {
      setError(null);
      setIsThinking(true);
      setStatusMessage("Synthesizing cinematic DNA from prompt…");

      let response: Response;
      try {
        response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: nextPrompt }),
        });
      } catch (fetchError) {
        console.error(fetchError);
        setError("Network hiccup while contacting the scene generator.");
        setIsThinking(false);
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(
          payload?.issues?.[0] ??
            "Unable to decode the scene. Adjust the prompt and retry.",
        );
        setIsThinking(false);
        return;
      }

      const payload = (await response.json()) as {
        status: string;
        recipe: SceneRecipe;
      };

      setRecipe(payload.recipe);
      setStatusMessage("Scene graph stabilized. Spooling render pipeline…");
      await wait(220);
      setIsThinking(false);
      triggerRender(payload.recipe);
    },
    [triggerRender],
  );

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    const timer = window.setTimeout(() => {
      requestScene(DEFAULT_PROMPT).catch(() => {
        setError("Initial scene failed to generate. Try submitting a new prompt.");
      });
    }, 60);

    return () => {
      window.clearTimeout(timer);
    };
  }, [requestScene]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!prompt.trim() || isThinking || isRendering) return;
      await requestScene(prompt.trim());
    },
    [isThinking, isRendering, prompt, requestScene],
  );

  const handlePromptClick = useCallback(
    async (sample: string) => {
      setPrompt(sample);
      await requestScene(sample);
    },
    [requestScene],
  );

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100">
      <header className="border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-end md:justify-between md:py-14">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm uppercase tracking-[0.45rem] text-zinc-400">
              Sora-2 Inspired Video Synthesis
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
              Agentic Video Architect that dreams in motion.
            </h1>
            <p className="max-w-2xl text-lg text-zinc-300 md:text-xl">
              Feed it a cinematic idea. It distills mood, camera grammar, and
              motion design into a fully rendered clip in seconds. Optimized for
              expressive ideation, Vercel-native deployment, and rapid iteration.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-zinc-200 shadow-lg shadow-purple-500/10 backdrop-blur">
            <p className="font-semibold text-white">Pipeline Health</p>
            <p className="text-zinc-300">
              {statusMessage || "Awaiting prompt to begin synthesis."}
            </p>
            <p className="text-xs text-emerald-300">
              {isRendering ? `Rendering ${renderProgress}%` : "Idle"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-24 pt-10 lg:grid lg:grid-cols-[2fr_1fr] lg:items-start lg:gap-12">
        <section className="flex flex-col gap-6">
          <form
            className="relative flex w-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-purple-500/10 backdrop-blur"
            onSubmit={handleSubmit}
          >
            <label className="space-y-3">
              <span className="text-sm uppercase tracking-[0.4rem] text-zinc-400">
                Prompt
              </span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={3}
                className="min-h-[110px] w-full rounded-2xl border border-white/[0.08] bg-zinc-950/80 p-4 text-base text-white shadow-inner shadow-purple-500/5 outline-none ring-0 transition focus:border-purple-400/60 focus:bg-zinc-900"
                placeholder="Describe the world you want to witness unfolding…"
              />
            </label>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-zinc-400">
                {error ? (
                  <span className="text-rose-300">{error}</span>
                ) : (
                  "Longer prompts uncover richer camera choreography."
                )}
              </p>
              <button
                type="submit"
                disabled={isThinking || isRendering}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-purple-500/30 transition enabled:hover:scale-[1.02] enabled:hover:shadow-purple-500/40 disabled:opacity-50"
              >
                {isThinking || isRendering ? "Generating…" : "Generate scene"}
              </button>
            </div>
          </form>

          <div className="flex flex-wrap gap-3">
            {HERO_PROMPTS.map((sample) => (
              <button
                key={sample}
                type="button"
                className="min-w-[220px] flex-1 rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3 text-left text-sm text-zinc-200 shadow-lg shadow-purple-500/10 transition hover:border-white/20 hover:bg-white/[0.06]"
                onClick={() => handlePromptClick(sample)}
              >
                {sample}
              </button>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl shadow-purple-500/20">
            <canvas
              ref={canvasRef}
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              className="hidden"
            />
            <div className="relative aspect-video w-full bg-zinc-900">
              {videoUrl ? (
                <video
                  key={videoUrl}
                  src={videoUrl}
                  className="h-full w-full object-cover"
                  controls
                  loop
                  autoPlay
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="animate-pulse text-zinc-400">
                    {isRendering
                      ? `Rendering ${renderProgress}%`
                      : "Awaiting first render…"}
                  </div>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-zinc-950/70 via-zinc-950/0 px-6 pb-5 pt-16 text-sm text-white">
                <div>
                  <p className="text-xs uppercase tracking-[0.35rem] text-zinc-300">
                    Cinematic fingerprint
                  </p>
                  <p className="text-lg font-medium">
                    {recipe?.mood ?? "Awaiting mood"}
                  </p>
                </div>
                {videoUrl && (
                  <a
                    href={videoUrl}
                    download="agentic-sora-clip.webm"
                    className="rounded-full bg-white/10 px-5 py-2 text-xs uppercase tracking-wide text-white shadow shadow-purple-500/30 backdrop-blur transition hover:bg-white/20"
                  >
                    Download clip
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-lg shadow-purple-500/15 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">Scene Telemetry</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm text-zinc-300">
              <div>
                <dt className="text-zinc-400">Duration</dt>
                <dd>{recipe ? `${formatFloat(recipe.duration)}s` : "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">Frame rate</dt>
                <dd>{recipe ? `${recipe.fps} fps` : "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">Lens design</dt>
                <dd>{recipe?.camera.lens ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">Color grade</dt>
                <dd>{recipe?.camera.grade ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">Audio DNA</dt>
                <dd>{recipe?.audioHint ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">Prompt hash</dt>
                <dd className="text-xs text-zinc-400">{recipe?.id ?? "—"}</dd>
              </div>
            </dl>
            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.35rem] text-zinc-400">
                Palette
              </p>
              <div className="mt-3 flex gap-2">
                {recipe?.palette.map((color) => (
                  <div
                    key={color}
                    className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 text-xs font-medium"
                    style={{ background: color }}
                  >
                    <span className="text-white drop-shadow">
                      {color.toUpperCase()}
                    </span>
                  </div>
                )) ?? <p className="text-sm text-zinc-400">Colors pending</p>}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-lg shadow-purple-500/15 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">Narrative Beats</h2>
            <ol className="mt-4 space-y-4 text-sm text-zinc-300">
              {recipe?.story.map((beat) => (
                <li
                  key={beat.title}
                  className="rounded-2xl border border-white/5 bg-white/[0.04] p-4 shadow-inner shadow-purple-500/10"
                >
                  <p className="text-xs uppercase tracking-[0.3rem] text-zinc-400">
                    {formatFloat(beat.at * 100)}% timeline
                  </p>
                  <p className="mt-2 text-base font-medium text-white">
                    {beat.title}
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">{beat.description}</p>
                </li>
              )) ?? <p className="text-sm text-zinc-400">Awaiting beats…</p>}
            </ol>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 via-cyan-500/10 to-transparent p-[1px] shadow-xl shadow-purple-500/20">
            <div className="rounded-[calc(1.5rem-1px)] bg-zinc-950/90 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white">
                How to iterate faster
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                <li>
                  Modulate{" "}
                  <span className="font-semibold text-white">camera intent</span>{" "}
                  by adding verbs like “glides”, “orbits”, “dives”.
                </li>
                <li>
                  Layer{" "}
                  <span className="font-semibold text-white">sensory detail</span>{" "}
                  (temperature, material, sound) to evolve palette + audio hints.
                </li>
                <li>
                  Combine contrasting settings to unlock hybrid theme blending,
                  e.g. “celestial rainforest observatory”.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
