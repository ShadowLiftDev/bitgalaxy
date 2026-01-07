"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GameQuestShell } from "./GameQuestShell";

type GalaxyPaddleGameProps = {
  orgId: string;
  userId: string | null;
  isGuest: boolean;
};

type GameConfig = {
  width: number;
  height: number;
  paddleWidth: number;
  paddleHeight: number;
  paddleMarginBottom: number;
  ballRadius: number;
};

const CONFIG: GameConfig = {
  width: 320,
  height: 440,
  paddleWidth: 80,
  paddleHeight: 10,
  paddleMarginBottom: 24,
  ballRadius: 8,
};

type GameState = {
  paddleX: number;
  ballX: number;
  ballY: number;
  velX: number;
  velY: number;
  running: boolean;
  gameOver: boolean;
  hits: number;
  maxSpeed: number;
};

function computeTierFromStats(hits: number, elapsedMs: number): 1 | 2 | 3 {
  const sec = elapsedMs / 1000;

  // Tunable thresholds
  const t1 = sec >= 10 || hits >= 5;
  const t2 = sec >= 25 || hits >= 15;
  const t3 = sec >= 45 || hits >= 30;

  if (t3) return 3;
  if (t2) return 2;
  if (t1) return 1;
  return 1;
}

export function GalaxyPaddleGame({
  orgId,
  userId,
  isGuest,
}: GalaxyPaddleGameProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const animationRef = useRef<number | null>(null);

  // visible stats
  const [hits, setHits] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // tier (weekly 3-tier system)
  const [tier, setTier] = useState<1 | 2 | 3>(1);

  // submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // timer bookkeeping
  const timerStartRef = useRef<number | null>(null);

  const seconds = (elapsedMs / 1000).toFixed(1);

  function initGameState() {
    const { width, height, paddleWidth, paddleMarginBottom } = CONFIG;
    const paddleX = (width - paddleWidth) / 2;
    const initialSpeed = Math.sqrt(2.2 * 2.2 + 3.0 * 3.0);

    gameStateRef.current = {
      paddleX,
      ballX: width / 2,
      ballY: height / 2,
      velX: 2.2,
      velY: -3.0,
      running: false,
      gameOver: false,
      hits: 0,
      maxSpeed: initialSpeed,
    };

    setHits(0);
    setMaxSpeed(initialSpeed);
    setElapsedMs(0);
    setIsRunning(false);
    setGameOver(false);
    setTier(1);
    setSubmitError(null);
    setSubmitSuccess(false);
    timerStartRef.current = null;
  }

  useEffect(() => {
    initGameState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height, paddleWidth, paddleHeight, paddleMarginBottom, ballRadius } =
      CONFIG;

    const drawFrame = () => {
      const state = gameStateRef.current;
      if (!state) {
        animationRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      let {
        paddleX,
        ballX,
        ballY,
        velX,
        velY,
        running,
        gameOver: stateGameOver,
        hits: localHits,
        maxSpeed: localMaxSpeed,
      } = state;

      const now = performance.now();

      if (running && !stateGameOver) {
        if (timerStartRef.current == null) {
          timerStartRef.current = now;
        }
        const elapsed = now - timerStartRef.current;
        setElapsedMs(elapsed);

        ballX += velX;
        ballY += velY;

        // walls
        if (ballX - ballRadius <= 0) {
          ballX = ballRadius;
          velX = Math.abs(velX);
        } else if (ballX + ballRadius >= width) {
          ballX = width - ballRadius;
          velX = -Math.abs(velX);
        }

        // top
        if (ballY - ballRadius <= 0) {
          ballY = ballRadius;
          velY = Math.abs(velY);
        }

        // paddle
        const paddleTopY = height - paddleMarginBottom - paddleHeight;
        const paddleBottomY = height - paddleMarginBottom;

        if (
          ballY + ballRadius >= paddleTopY &&
          ballY + ballRadius <= paddleBottomY &&
          ballX >= paddleX &&
          ballX <= paddleX + paddleWidth &&
          velY > 0
        ) {
          ballY = paddleTopY - ballRadius;
          velY = -Math.abs(velY);

          const hitPos =
            (ballX - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);
          velX = velX + hitPos * 1.4;

          const speed = Math.sqrt(velX * velX + velY * velY);
          const speedFactor = 1.04;
          const newSpeed = speed * speedFactor;
          const normX = velX / speed;
          const normY = velY / speed;
          velX = normX * newSpeed;
          velY = normY * newSpeed;

          localHits += 1;
          localMaxSpeed = Math.max(localMaxSpeed, newSpeed);

          setHits(localHits);
          setMaxSpeed(localMaxSpeed);
        }

        // miss
        if (ballY - ballRadius > height) {
          running = false;
          stateGameOver = true;
          setIsRunning(false);
          setGameOver(true);

          // Deterministic tier calculation based on the final stats
          const finalElapsed =
            timerStartRef.current != null ? now - timerStartRef.current : elapsedMs;
          const computedTier = computeTierFromStats(localHits, finalElapsed);
          setTier(computedTier);
        }

        gameStateRef.current = {
          paddleX,
          ballX,
          ballY,
          velX,
          velY,
          running,
          gameOver: stateGameOver,
          hits: localHits,
          maxSpeed: localMaxSpeed,
        };
      }

      // draw
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#020617");
      gradient.addColorStop(1, "#0f172a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(56,189,248,0.10)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let y = height; y > 0; y -= gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y - gridSize / 2);
        ctx.stroke();
      }

      // paddle
      ctx.fillStyle = "#38bdf8";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 16;
      ctx.fillRect(
        paddleX,
        height - paddleMarginBottom - paddleHeight,
        paddleWidth,
        paddleHeight,
      );
      ctx.shadowBlur = 0;

      // ball
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#f97316";
      ctx.shadowColor = "#f97316";
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.closePath();
      ctx.shadowBlur = 0;

      // starfield
      ctx.fillStyle = "rgba(148,163,184,0.4)";
      for (let i = 0; i < 16; i++) {
        const sx = (i * 23) % width;
        const sy = (i * 53 + (now / 35) % height) % height;
        ctx.fillRect(sx, sy, 1, 1);
      }

      animationRef.current = requestAnimationFrame(drawFrame);
    };

    animationRef.current = requestAnimationFrame(drawFrame);

    return () => {
      if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startGameIfNeeded() {
    const state = gameStateRef.current;
    if (!state) return;

    if (!state.running && !state.gameOver) {
      gameStateRef.current = { ...state, running: true };
      setIsRunning(true);
      timerStartRef.current = performance.now();
    }
  }

  function handlePointerMove(
    e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>,
  ) {
    const state = gameStateRef.current;
    if (!state) return;

    const container = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - container.left;
    const scaleX = CONFIG.width / container.width;

    const paddleCenterX = relativeX * scaleX;
    let newPaddleX = paddleCenterX - CONFIG.paddleWidth / 2;

    if (newPaddleX < 0) newPaddleX = 0;
    if (newPaddleX + CONFIG.paddleWidth > CONFIG.width) {
      newPaddleX = CONFIG.width - CONFIG.paddleWidth;
    }

    gameStateRef.current = { ...state, paddleX: newPaddleX };

    if (!state.gameOver) startGameIfNeeded();
  }

  function handleReset() {
    initGameState();
  }

  async function handleSubmitCompletion() {
    if (submitting || !gameOver) return;

    // Guest mode: allow play, but no XP / quest logging
    if (isGuest || !userId) {
      setSubmitError(
        "You’re playing as a guest. Sign in on the BitGalaxy dashboard to log XP and quest progress.",
      );
      setSubmitSuccess(false);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/bitgalaxy/quests/complete-galaxy-paddle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          userId,
          questId: "galaxy-paddle",
          level: tier,
          stats: {
            hits,
            timeMs: Math.round(elapsedMs),
            maxSpeed,
          },
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to sync completion.");
      }

      setSubmitSuccess(true);

      setTimeout(() => {
        const params = new URLSearchParams({ orgId, userId });
        router.push(`/bitgalaxy?${params.toString()}`);
      }, 900);
    } catch (err: any) {
      console.error("Galaxy Paddle completion error:", err);
      setSubmitError(
        err?.message ||
          "We completed locally, but couldn’t sync with the server. Staff can still verify your progress.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = isGuest
    ? "Sign in to log XP"
    : submitting
    ? "Syncing…"
    : gameOver
    ? `Log Tier ${tier} & award XP`
    : "Finish a run to log XP";

  return (
    <GameQuestShell
      badgeLabel="Side Quest"
      title="Galaxy Paddle"
      subtitle="Hold the defensive line. Keep the neon core in play as long as you can."
      orgId={orgId}
      userId={userId ?? ""} // guests pass an empty string; shell can ignore / treat as unl inked
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-sky-500/40 bg-slate-950/95 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4 text-[11px]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-400/80">
              Time Online
            </p>
            <p className="mt-1 font-mono text-sm text-sky-100">{seconds}s</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-400/80">
              Returns
            </p>
            <p className="mt-1 font-mono text-sm text-sky-100">{hits}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-400/80">
              Max Velocity
            </p>
            <p className="mt-1 font-mono text-sm text-sky-100">
              {maxSpeed.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-400/80">
              Tier
            </p>
            <p className="mt-1 font-mono text-sm text-sky-100">{tier}</p>
          </div>
        </div>

        <div className="mt-2 flex flex-col items-start gap-2 text-[11px] sm:mt-0 sm:flex-row sm:items-center sm:gap-3">
          {gameOver ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/60 bg-rose-500/10 px-3 py-1 text-rose-200">
              <span className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_12px_rgba(248,113,113,0.8)]" />
              Run complete — Tier {tier} ready to log
            </span>
          ) : isRunning ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/60 bg-sky-500/10 px-3 py-1 text-sky-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
              Holding the line…
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/60 bg-slate-900/80 px-3 py-1 text-slate-200/90">
              Move the paddle to begin
            </span>
          )}

          {isGuest && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-500/10 px-3 py-1 text-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
              Guest mode — XP won’t be logged
            </span>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="text-[10px] text-sky-300/80 underline-offset-2 hover:text-sky-200 hover:underline"
          >
            Reset run
          </button>
        </div>
      </div>

      <div
        className="mt-4 flex justify-center"
        onPointerMove={handlePointerMove}
        onMouseMove={handlePointerMove}
      >
        <div className="relative w-full max-w-xs touch-pan-x">
          <div className="aspect-[8/11] overflow-hidden rounded-2xl border border-sky-500/40 bg-slate-900 shadow-[0_0_40px_rgba(56,189,248,0.4)]">
            <canvas
              ref={canvasRef}
              width={CONFIG.width}
              height={CONFIG.height}
              className="h-full w-full"
            />
          </div>
        </div>
      </div>

      {submitError && (
        <p className="mt-3 text-[11px] text-rose-300">{submitError}</p>
      )}
      {submitSuccess && (
        <p className="mt-3 text-[11px] text-emerald-300">
          Mission synced. Updating BitGalaxy…
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSubmitCompletion}
          disabled={submitting || !gameOver || isGuest}
          className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.7)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </GameQuestShell>
  );
}