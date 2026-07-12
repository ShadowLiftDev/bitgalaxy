"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { GameQuestShell } from "./GameQuestShell";

type LunchboxRunGameProps = {
  orgId: string;
  worldName: string;
  memberId: string | null;
  memberName?: string | null;
  isGuest: boolean;
};

type GameState = "ready" | "running" | "gameover";

type CollisionBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type LunchboxRunCompletionResponse = {
  success?: boolean;
  error?: string;
  result?: {
    submittedLevel?: number;
    weeklyBestLevel?: number;
    weeklyBestScore?: number;
    xpAwarded?: number;
    statsImproved?: boolean;
    bestScore?: number | null;
    runs?: number;
  };
};

function randRange(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function aabb(a: CollisionBox, b: CollisionBox) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: boolean,
  stroke: boolean,
) {
  const rr = Math.min(r, w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();

  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function glowLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  blur: number,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.shadowBlur = blur;
  ctx.shadowColor = color;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.restore();
}

function buildReturnHref({
  orgId,
  memberId,
  isGuest,
}: {
  orgId: string;
  memberId: string | null;
  isGuest: boolean;
}) {
  const params = new URLSearchParams({ orgId });

  if (isGuest) {
    params.set("guest", "1");
  } else if (memberId) {
    params.set("memberId", memberId);
  }

  return `/bitgalaxy/games?${params.toString()}`;
}

export function LunchboxRunGame({
  orgId,
  worldName,
  memberId,
  memberName = null,
  isGuest,
}: LunchboxRunGameProps) {
  const router = useRouter();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const uiStateRef = useRef<GameState>("ready");
  const spriteRef = useRef<HTMLImageElement | null>(null);
  const hiRef = useRef(0);
  const submissionStartedRef = useRef(false);

  const [uiState, setUiState] = useState<GameState>("ready");
  const [spriteReady, setSpriteReady] = useState(false);
  const [score, setScore] = useState(0);
  const [hi, setHi] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const cfg = useMemo(
    () => ({
      width: 500,
      height: 320,

      groundY: 238,
      gravity: 2900,
      jumpVel: 963,

      baseSpeed: 350,
      maxSpeed: 1500,

      speedupMinS: 6,
      speedupMaxS: 10,
      speedupMinMult: 1.05,
      speedupMaxMult: 1.3,

      obstacleBaseGap: 325,
      obstacleGapScale: 0.25,

      hitInsetX: 12,
      hitInsetY: 15,
      hitInsetW: 22,
      hitInsetH: 20,
    }),
    [],
  );

  const returnHref = buildReturnHref({
    orgId,
    memberId,
    isGuest,
  });

  function setState(next: GameState) {
    uiStateRef.current = next;
    setUiState(next);
  }

  useEffect(() => {
    const storedValue = window.localStorage.getItem("bg_lunchbox_run_hi");
    const parsedValue = storedValue ? Number(storedValue) : 0;
    const nextValue = Number.isFinite(parsedValue) ? parsedValue : 0;

    hiRef.current = nextValue;
    setHi(nextValue);
  }, []);

  useEffect(() => {
    const img = new Image();

    img.src = "/bitgalaxy/sprites/lenny.png";

    img.onload = () => {
      spriteRef.current = img;
      setSpriteReady(true);
    };

    img.onerror = () => {
      console.error("Failed to load Lenny sprite PNG");
      spriteRef.current = null;
      setSpriteReady(false);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctxMaybe = canvas.getContext("2d");
    if (!ctxMaybe) return;

    const ctx: CanvasRenderingContext2D = ctxMaybe;

    const view = {
      w: cfg.width,
      h: cfg.height,
      sx: 1,
      sy: 1,
    };

    function isMobileView() {
      return view.w < 520;
    }

    const BASE_PLAYER = {
      x: 120,
      w: 50,
      h: 50,
    };

    const player = {
      x: BASE_PLAYER.x,
      y: cfg.groundY,
      w: BASE_PLAYER.w,
      h: BASE_PLAYER.h,
      vy: 0,
      onGround: true,
    };

    function resizeCanvas() {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;

      const context = canvasEl.getContext("2d");
      if (!context) return;

      const parent = canvasEl.parentElement;
      const cssW = parent ? parent.clientWidth : cfg.width;
      const cssH = Math.round(cssW * (cfg.height / cfg.width));

      const dpr = Math.max(
        1,
        Math.min(2, window.devicePixelRatio || 1),
      );

      canvasEl.width = Math.floor(cssW * dpr);
      canvasEl.height = Math.floor(cssH * dpr);

      canvasEl.style.width = `${cssW}px`;
      canvasEl.style.height = `${cssH}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      view.w = cssW;
      view.h = cssH;

      if (isMobileView()) {
        player.w = Math.round(BASE_PLAYER.w * 0.82);
        player.h = Math.round(BASE_PLAYER.h * 0.82);
        player.x = Math.round(BASE_PLAYER.x * 0.78);
      } else {
        player.w = BASE_PLAYER.w;
        player.h = BASE_PLAYER.h;
        player.x = BASE_PLAYER.x;
      }

      view.sx = cssW / cfg.width;
      view.sy = cssH / cfg.height;
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let raf = 0;
    let last = performance.now();

    let runTime = 0;
    let motionTime = 0;

    let internalScore = 0;
    let speed = cfg.baseSpeed;

    let nextSpeedUpAt = randRange(
      cfg.speedupMinS,
      cfg.speedupMaxS,
    );

    let speedupsCount = 0;
    let jumps = 0;
    let runStartMs = 0;

    const groundLineY = () => cfg.groundY + player.h;

    type Cloud = {
      x: number;
      y: number;
      w: number;
      h: number;
      speed: number;
      alpha: number;
      glow: "cyan" | "pink" | "white";
    };

    let clouds: Cloud[] = [];

    function spawnCloud(seedX?: number) {
      const w = randRange(70, 170);
      const h = randRange(22, 55);
      const y = randRange(
        30,
        Math.max(40, groundLineY() - 140),
      );

      const cSpeed = randRange(18, 45);
      const alpha = randRange(0.12, 0.28);

      const glowRoll = Math.random();

      const glow: Cloud["glow"] =
        glowRoll < 0.45
          ? "cyan"
          : glowRoll < 0.85
            ? "pink"
            : "white";

      clouds.push({
        x: seedX ?? cfg.width + randRange(10, 180),
        y,
        w,
        h,
        speed: cSpeed,
        alpha,
        glow,
      });
    }

    function drawCloudShape(
      x: number,
      y: number,
      w: number,
      h: number,
    ) {
      const r1 = h * 0.55;
      const r2 = h * 0.45;
      const r3 = h * 0.5;

      ctx.beginPath();

      ctx.arc(
        x + w * 0.25,
        y + h * 0.6,
        r1,
        Math.PI * 0.9,
        Math.PI * 2.1,
      );

      ctx.arc(
        x + w * 0.45,
        y + h * 0.4,
        r2,
        Math.PI,
        Math.PI * 2.2,
      );

      ctx.arc(
        x + w * 0.68,
        y + h * 0.58,
        r3,
        Math.PI * 0.9,
        Math.PI * 2.1,
      );

      ctx.closePath();
    }

    function drawClouds() {
      for (const cloud of clouds) {
        let glowColor = "rgba(234,246,255,0.65)";

        if (cloud.glow === "cyan") {
          glowColor = "rgba(102,204,255,0.70)";
        }

        if (cloud.glow === "pink") {
          glowColor = "rgba(255,80,200,0.65)";
        }

        ctx.save();
        ctx.globalAlpha = cloud.alpha;
        ctx.shadowBlur = 22;
        ctx.shadowColor = glowColor;
        ctx.fillStyle = glowColor;

        drawCloudShape(
          cloud.x,
          cloud.y,
          cloud.w,
          cloud.h,
        );

        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = cloud.alpha * 0.45;
        ctx.fillStyle = "rgba(255,255,255,0.75)";

        drawCloudShape(
          cloud.x + 6,
          cloud.y + 3,
          cloud.w - 12,
          cloud.h - 8,
        );

        ctx.fill();
        ctx.restore();
      }
    }

    const stars = Array.from({ length: 90 }).map(() => ({
      x: Math.random() * cfg.width,
      y: Math.random() * Math.max(20, groundLineY() - 70),
      r: 0.6 + Math.random() * 1.6,
      a: 0.35 + Math.random() * 0.65,
      tw: 0.5 + Math.random() * 1.6,
    }));

    function drawStars() {
      for (const star of stars) {
        const twinkle =
          0.25 * Math.sin(motionTime * star.tw) + 0.75;

        ctx.globalAlpha = Math.min(
          1,
          Math.max(0, star.a * twinkle),
        );

        ctx.fillStyle = "rgba(234,246,255,1)";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }

    function drawSkyAndGround() {
      const sky = ctx.createLinearGradient(
        0,
        0,
        0,
        groundLineY(),
      );

      sky.addColorStop(0, "rgba(6, 6, 18, 1)");
      sky.addColorStop(1, "rgba(12, 8, 30, 1)");

      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, cfg.width, groundLineY());

      const floor = ctx.createLinearGradient(
        0,
        groundLineY(),
        0,
        cfg.height,
      );

      floor.addColorStop(0, "rgba(4, 4, 12, 1)");
      floor.addColorStop(1, "rgba(1, 1, 6, 1)");

      ctx.fillStyle = floor;

      ctx.fillRect(
        0,
        groundLineY(),
        cfg.width,
        cfg.height - groundLineY(),
      );
    }

    function drawGroundLine() {
      glowLine(
        ctx,
        0,
        groundLineY(),
        cfg.width,
        groundLineY(),
        "rgba(255,80,200,0.55)",
        2,
        18,
      );

      ctx.save();
      ctx.globalAlpha = 0.14;

      const haze = ctx.createLinearGradient(
        0,
        groundLineY(),
        0,
        groundLineY() + 40,
      );

      haze.addColorStop(0, "rgba(255,80,200,0.9)");
      haze.addColorStop(1, "rgba(255,80,200,0)");

      ctx.fillStyle = haze;
      ctx.fillRect(0, groundLineY(), cfg.width, 46);
      ctx.restore();
    }

    type Obstacle = {
      x: number;
      y: number;
      w: number;
      h: number;
      emoji: string;
    };

    const EMOJIS = ["🥤", "🥪", "🥧", "🥗", "🍗"] as const;

    let obstacles: Obstacle[] = [];
    let distSinceSpawn = 0;

    function pickEmoji() {
      return EMOJIS[
        Math.floor(Math.random() * EMOJIS.length)
      ];
    }

    function spawnObstacleGroup() {
      const gap = 12;
      const w = 44;
      const h = 44;

      const tripleWidth = w * 3 + gap * 2;
      const buffer = 26;
      const airTime = (2 * cfg.jumpVel) / cfg.gravity;

      const triplesUnlocked =
        speed * airTime >= tripleWidth + buffer;

      let count = 1;

      if (!triplesUnlocked) {
        count = Math.random() < 0.35 ? 2 : 1;
      } else {
        count =
          Math.random() < 0.16
            ? 3
            : Math.random() < 0.42
              ? 2
              : 1;
      }

      const emoji = pickEmoji();
      const startX = cfg.width + 20;

      for (let index = 0; index < count; index += 1) {
        obstacles.push({
          x: startX + index * (w + gap),
          y: groundLineY() - h,
          w,
          h,
          emoji,
        });
      }
    }

    function getHitbox(): CollisionBox {
      return {
        x: player.x + cfg.hitInsetX,
        y: player.y + cfg.hitInsetY,
        w: player.w - cfg.hitInsetW,
        h: player.h - cfg.hitInsetH,
      };
    }

    function drawObstacle(obstacle: Obstacle) {
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(255,80,200,0.55)";
      ctx.globalAlpha = 0.95;

      const fontSize = 34;

      ctx.font =
        `${fontSize}px ui-sans-serif, system-ui, ` +
        `"Apple Color Emoji", "Segoe UI Emoji"`;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const centerX = obstacle.x + obstacle.w / 2;
      const centerY = obstacle.y + obstacle.h / 2 + 1;

      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.35)";

      ctx.strokeText(
        obstacle.emoji,
        centerX,
        centerY,
      );

      ctx.fillText(
        obstacle.emoji,
        centerX,
        centerY,
      );

      ctx.restore();

      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }

    function drawLenny() {
      const img = spriteRef.current;

      if (!img) {
        ctx.fillStyle = "rgba(102, 204, 255, 0.9)";

        roundRect(
          ctx,
          player.x,
          player.y,
          player.w,
          player.h,
          12,
          true,
          false,
        );

        return;
      }

      const pad = Math.max(
        1,
        Math.round(player.w * 0.04),
      );

      ctx.drawImage(
        img,
        player.x - pad,
        player.y - pad,
        player.w + pad * 2,
        player.h + pad * 2,
      );
    }

    function drawOverlay(text: string) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, cfg.width, cfg.height);

      ctx.fillStyle = "rgba(234,246,255,0.95)";
      ctx.font = "700 22px ui-sans-serif, system-ui";

      const textWidth = ctx.measureText(text).width;

      ctx.fillText(
        text,
        cfg.width / 2 - textWidth / 2,
        cfg.height / 2,
      );
    }

    function drawHud() {
      ctx.fillStyle = "rgba(234,246,255,0.92)";
      ctx.font = "14px ui-sans-serif, system-ui";

      ctx.fillText(
        `Score: ${Math.floor(internalScore)}`,
        18,
        24,
      );

      ctx.fillText(
        `HI: ${hiRef.current}`,
        18,
        44,
      );
    }

    function resetRun() {
      runTime = 0;
      motionTime = 0;

      internalScore = 0;
      speed = cfg.baseSpeed;

      nextSpeedUpAt = randRange(
        cfg.speedupMinS,
        cfg.speedupMaxS,
      );

      speedupsCount = 0;
      jumps = 0;
      runStartMs = 0;

      submissionStartedRef.current = false;

      player.y = cfg.groundY;
      player.vy = 0;
      player.onGround = true;

      obstacles = [];
      distSinceSpawn = 200;

      clouds = [];

      for (let index = 0; index < 7; index += 1) {
        spawnCloud(randRange(0, cfg.width));
      }

      setScore(0);
      setSubmitError(null);
      setSubmitMessage(null);
    }

    function toReady() {
      resetRun();
      setState("ready");
    }

    function startRunIfNeeded() {
      if (uiStateRef.current !== "ready") return;

      runStartMs = Date.now();
      setState("running");
    }

    function jump() {
      if (uiStateRef.current !== "running") return;
      if (!player.onGround) return;

      player.vy = -cfg.jumpVel;
      player.onGround = false;
      jumps += 1;
    }

    async function submitRun(finalScore: number) {
      if (submissionStartedRef.current) return;

      submissionStartedRef.current = true;

      if (isGuest || !memberId) {
        setSubmitError(null);

        setSubmitMessage(
          "Guest run complete. XP and official Lunchbox Run records were not saved.",
        );

        return;
      }

      const timeMs = runStartMs
        ? Math.max(1, Date.now() - runStartMs)
        : 1;

      try {
        setSubmitting(true);
        setSubmitError(null);
        setSubmitMessage(null);

        const response = await fetch(
          "/api/bitgalaxy/quests/complete-lunchbox-run",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              orgId,
              memberId,
              score: Math.floor(finalScore),
              stats: {
                timeMs,
                jumps,
                speedups: speedupsCount,
              },
            }),
          },
        );

        const data = (await response
          .json()
          .catch(() => ({}))) as LunchboxRunCompletionResponse;

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ?? "Could not submit Lunchbox Run.",
          );
        }

        const submittedLevel =
          data.result?.submittedLevel ?? 0;

        const xpAwarded =
          data.result?.xpAwarded ?? 0;

        const statsImproved =
          data.result?.statsImproved === true;

        if (xpAwarded > 0) {
          setSubmitMessage(
            `Tier ${submittedLevel} synced. You earned ${xpAwarded} XP.`,
          );
        } else if (statsImproved) {
          setSubmitMessage(
            "New Lunchbox Run personal best recorded. No additional weekly XP was available.",
          );
        } else {
          setSubmitMessage(
            "Run recorded. No additional XP was available for this tier.",
          );
        }

        window.setTimeout(() => {
          router.push(returnHref);
          router.refresh();
        }, 1200);
      } catch (error: unknown) {
        console.error(
          "Lunchbox Run submission error:",
          error,
        );

        setSubmitError(
          error instanceof Error
            ? error.message
            : "The run ended locally, but the result could not be synchronized.",
        );
      } finally {
        setSubmitting(false);
      }
    }

    function endGame() {
      if (uiStateRef.current !== "running") return;

      const finalScore = Math.floor(internalScore);
      const nextHi = Math.max(hiRef.current, finalScore);

      if (nextHi !== hiRef.current) {
        hiRef.current = nextHi;
        setHi(nextHi);

        window.localStorage.setItem(
          "bg_lunchbox_run_hi",
          String(nextHi),
        );
      }

      setState("gameover");
      void submitRun(finalScore);
    }

    function weightedGapJitter() {
      const randomValue = Math.random();

      if (randomValue < 0.12) {
        return randRange(-120, -20);
      }

      if (randomValue < 0.82) {
        return randRange(0, 220);
      }

      return randRange(220, 520);
    }

    function update(dt: number) {
      if (uiStateRef.current !== "running") return;

      runTime += dt;

      if (
        runTime >= nextSpeedUpAt &&
        speed < cfg.maxSpeed
      ) {
        const multiplier = randRange(
          cfg.speedupMinMult,
          cfg.speedupMaxMult,
        );

        speed = Math.min(
          cfg.maxSpeed,
          speed * multiplier,
        );

        speedupsCount += 1;

        nextSpeedUpAt += randRange(
          cfg.speedupMinS,
          cfg.speedupMaxS,
        );
      }

      internalScore += dt * (5 + speed * 0.05);
      setScore(Math.floor(internalScore));

      for (const cloud of clouds) {
        cloud.x -= cloud.speed * dt + speed * 0.08 * dt;
      }

      clouds = clouds.filter(
        (cloud) => cloud.x + cloud.w > -200,
      );

      if (clouds.length < 9 && Math.random() < 0.03) {
        spawnCloud();
      }

      player.vy += cfg.gravity * dt;
      player.y += player.vy * dt;

      if (player.y >= cfg.groundY) {
        player.y = cfg.groundY;
        player.vy = 0;
        player.onGround = true;
      } else {
        player.onGround = false;
      }

      distSinceSpawn += speed * dt;

      const warmupSeconds = 25;
      const warmupT = Math.min(
        runTime / warmupSeconds,
        1,
      );

      const earlyBonusGap = (1 - warmupT) * 220;

      const desiredGap =
        cfg.obstacleBaseGap +
        speed * cfg.obstacleGapScale +
        earlyBonusGap +
        weightedGapJitter();

      if (distSinceSpawn >= desiredGap) {
        spawnObstacleGroup();
        distSinceSpawn = 0;
      }

      for (const obstacle of obstacles) {
        obstacle.x -= speed * dt;
      }

      obstacles = obstacles.filter(
        (obstacle) => obstacle.x + obstacle.w > -60,
      );

      const hitbox = getHitbox();

      for (const obstacle of obstacles) {
        if (aabb(hitbox, obstacle)) {
          endGame();
          break;
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, view.w, view.h);

      ctx.save();
      ctx.scale(view.sx, view.sy);

      drawSkyAndGround();
      drawStars();
      drawClouds();
      drawGroundLine();

      for (const obstacle of obstacles) {
        drawObstacle(obstacle);
      }

      drawLenny();
      drawHud();

      if (uiStateRef.current === "ready") {
        drawOverlay("Press SPACE to start");
      } else if (uiStateRef.current === "gameover") {
        drawOverlay("Game Over — Press R");
      }

      ctx.restore();
    }

    function tick(now: number) {
      const dt = Math.min(
        0.033,
        (now - last) / 1000,
      );

      last = now;

      if (uiStateRef.current === "running") {
        motionTime += dt;
      }

      update(dt);
      draw();

      raf = requestAnimationFrame(tick);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (
        event.code === "Space" ||
        event.code === "ArrowUp"
      ) {
        event.preventDefault();

        if (uiStateRef.current === "ready") {
          startRunIfNeeded();
        } else if (uiStateRef.current === "gameover") {
          toReady();
        } else {
          jump();
        }
      }

      if (event.code === "KeyR") {
        event.preventDefault();
        toReady();
      }
    }

    function onPointerDown(event: PointerEvent) {
      event.preventDefault();

      if (uiStateRef.current === "ready") {
        startRunIfNeeded();
      } else if (uiStateRef.current === "gameover") {
        toReady();
      } else {
        jump();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    const wrap = wrapRef.current;

    wrap?.addEventListener(
      "pointerdown",
      onPointerDown,
      { passive: false },
    );

    uiStateRef.current = "ready";
    setUiState("ready");
    resetRun();

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);

      window.removeEventListener(
        "keydown",
        onKeyDown,
      );

      window.removeEventListener(
        "resize",
        resizeCanvas,
      );

      wrap?.removeEventListener(
        "pointerdown",
        onPointerDown,
      );
    };
    // The canvas engine should only restart when its actual
    // identity or mode changes.
  }, [
    cfg,
    orgId,
    memberId,
    isGuest,
    returnHref,
    router,
  ]);

  const modeLabel = isGuest
    ? "Guest Mode"
    : submitting
      ? "Submitting..."
      : "Online Mode";

  return (
    <GameQuestShell
      badgeLabel="Arcade Game"
      title="Lunchbox Run"
      subtitle="Sprint the synthwave grid, leap over neon hazards, and survive long enough to unlock higher weekly tiers."
      orgId={orgId}
      worldName={worldName}
      memberId={memberId}
      memberName={memberName}
      isGuest={isGuest}
      returnHref={returnHref}
      returnLabel="Back to arcade"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-pink-500/30 bg-slate-950/95 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-4 text-[11px]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-pink-300/80">
              Score
            </p>

            <p className="mt-1 font-mono text-sm text-pink-100">
              {score}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-pink-300/80">
              Local High
            </p>

            <p className="mt-1 font-mono text-sm text-pink-100">
              {hi}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-pink-300/80">
              Status
            </p>

            <p className="mt-1 font-mono text-sm capitalize text-pink-100">
              {uiState}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] ${
            isGuest
              ? "border-amber-400/50 bg-amber-500/10 text-amber-200"
              : "border-sky-400/50 bg-sky-500/10 text-sky-200"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              uiState === "running"
                ? "animate-pulse bg-pink-400"
                : "bg-slate-400"
            }`}
          />

          {modeLabel}
        </span>
      </div>

      <div
        ref={wrapRef}
        className="mt-4 touch-manipulation select-none overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-0 sm:p-3"
      >
        <canvas
          ref={canvasRef}
          className="block h-auto w-full"
        />
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] leading-5 text-white/65">
        Press Space, Arrow Up, or tap the game area to start and jump. Speed
        increases every 6–10 seconds.
      </div>

      {!spriteReady && (
        <p className="mt-3 text-[11px] text-amber-200/80">
          Lenny’s sprite could not be loaded. A temporary runner shape is being
          used.
        </p>
      )}

      {submitError && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"
        >
          {submitError}
        </p>
      )}

      {submitMessage && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200"
        >
          {submitMessage}
        </p>
      )}
    </GameQuestShell>
  );
}