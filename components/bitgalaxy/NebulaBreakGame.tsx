"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GameQuestShell } from "./GameQuestShell";

type NebulaBreakGameProps = {
  orgId: string;
  userId: string;
};

type GameConfig = {
  width: number;
  height: number;
  paddleWidth: number;
  paddleHeight: number;
  paddleMarginBottom: number;
  ballRadius: number;
  brickRows: number;      // base rows for level 1
  brickCols: number;
  brickWidth: number;
  brickHeight: number;
  brickPadding: number;
  brickOffsetTop: number;
  brickOffsetLeft: number;
};

const CONFIG: GameConfig = {
  width: 320,
  height: 440,
  paddleWidth: 80,
  paddleHeight: 10,
  paddleMarginBottom: 24,
  ballRadius: 7,
  brickRows: 5,
  brickCols: 7,
  brickWidth: 30,
  brickHeight: 12,
  brickPadding: 6,
  brickOffsetTop: 40,
  brickOffsetLeft: 10,
};

type Brick = {
  x: number;
  y: number;
  active: boolean;
  powerUp?: "wide" | "slow";
};

type GameState = {
  paddleX: number;
  ballX: number;
  ballY: number;
  velX: number;
  velY: number;
  running: boolean;
  gameOver: boolean;
};

// Helper: tier → rows & speed scaling
function getLevelParams(level: number) {
  const clamped = Math.max(1, Math.min(3, Math.floor(level || 1)));
  const rows = CONFIG.brickRows + (clamped - 1) * 2; // 5, 7, 9
  const speedScale = 1 + (clamped - 1) * 0.5;        // 1.0, 1.5, 2.0
  return { rows, speedScale };
}

export function NebulaBreakGame({ orgId, userId }: NebulaBreakGameProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const bricksRef = useRef<Brick[]>([]);
  const animationRef = useRef<number | null>(null);

  const paddleWidthRef = useRef<number>(CONFIG.paddleWidth);
  const levelRef = useRef<number>(1); // current difficulty tier (1–3)

  // visible stats
  const [bricksBroken, setBricksBroken] = useState(0);
  const [powerUpsCollected, setPowerUpsCollected] = useState(0);
  const [score, setScore] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [allCleared, setAllCleared] = useState(false);

  // difficulty
  const [level, setLevel] = useState<1 | 2 | 3>(1);

  // submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // timer
  const timerStartRef = useRef<number | null>(null);

  const seconds = (elapsedMs / 1000).toFixed(1);

  function buildBricks(forLevel: number = levelRef.current) {
    const {
      brickCols,
      brickWidth,
      brickHeight,
      brickPadding,
      brickOffsetTop,
      brickOffsetLeft,
    } = CONFIG;

    const { rows } = getLevelParams(forLevel);

    const bricks: Brick[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < brickCols; col++) {
        const x =
          brickOffsetLeft + col * (brickWidth + brickPadding);
        const y =
          brickOffsetTop + row * (brickHeight + brickPadding);
        bricks.push({
          x,
          y,
          active: true,
          powerUp: undefined,
        });
      }
    }

    // assign a few power-ups (yellow bricks)
    if (bricks.length >= 4) {
      bricks[2].powerUp = "wide";
      bricks[bricks.length - 3].powerUp = "slow";
    }

    bricksRef.current = bricks;
  }

  function initGameState(forLevel: number = levelRef.current) {
    levelRef.current = forLevel;
    const {
      width,
      height,
      paddleMarginBottom,
      paddleHeight,
      ballRadius,
    } = CONFIG;

    paddleWidthRef.current = CONFIG.paddleWidth;

    // random starting X + random horizontal direction
    const startX =
      Math.random() * (width - ballRadius * 2) + ballRadius;
    const dirX = Math.random() < 0.5 ? -1 : 1;

    const { speedScale } = getLevelParams(forLevel);

    const paddleX = (width - paddleWidthRef.current) / 2;

    gameStateRef.current = {
      paddleX,
      ballX: startX,
      ballY: height - paddleMarginBottom - paddleHeight - 30,
      velX: 2.4 * speedScale * dirX,
      velY: -3.2 * speedScale,
      running: false,
      gameOver: false,
    };

    buildBricks(forLevel);
    setBricksBroken(0);
    setPowerUpsCollected(0);
    setScore(0);
    setElapsedMs(0);
    setIsRunning(false);
    setGameOver(false);
    setAllCleared(false);
    setSubmitError(null);
    setSubmitSuccess(false);
    timerStartRef.current = null;
  }

  // init
  useEffect(() => {
    initGameState(1);
  }, []);

  // game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const {
      width,
      height,
      paddleHeight,
      paddleMarginBottom,
      ballRadius,
    } = CONFIG;

    const drawFrame = () => {
      const state = gameStateRef.current;
      if (!state) {
        animationRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      const bricks = bricksRef.current;
      let {
        paddleX,
        ballX,
        ballY,
        velX,
        velY,
        running,
        gameOver,
      } = state;

      const now = performance.now();

      if (running && !gameOver) {
        // timer
        if (timerStartRef.current == null) {
          timerStartRef.current = now;
        }
        const elapsed = now - timerStartRef.current;
        setElapsedMs(elapsed);

        // move ball
        ballX += velX;
        ballY += velY;

        // wall collisions
        if (ballX - ballRadius <= 0) {
          ballX = ballRadius;
          velX = Math.abs(velX);
        } else if (ballX + ballRadius >= width) {
          ballX = width - ballRadius;
          velX = -Math.abs(velX);
        }

        if (ballY - ballRadius <= 0) {
          ballY = ballRadius;
          velY = Math.abs(velY);
        }

        // paddle collision
        const paddleTopY =
          height - paddleMarginBottom - paddleHeight;
        const paddleBottomY =
          height - paddleMarginBottom;

        if (
          ballY + ballRadius >= paddleTopY &&
          ballY + ballRadius <= paddleBottomY &&
          ballX >= paddleX &&
          ballX <= paddleX + paddleWidthRef.current &&
          velY > 0
        ) {
          // reflect
          ballY = paddleTopY - ballRadius;
          velY = -Math.abs(velY);

          // angle based on hit position
          const hitPos =
            (ballX - (paddleX + paddleWidthRef.current / 2)) /
            (paddleWidthRef.current / 2);
          velX = velX + hitPos * 1.5;
        }

        // bricks
        let localBricksBroken = 0;
        let localScoreDelta = 0;
        let localPowerUps = 0;
        let activeBricksCount = 0;

        for (let i = 0; i < bricks.length; i++) {
          const brick = bricks[i];
          if (!brick.active) continue;
          activeBricksCount++;

          if (
            ballX + ballRadius > brick.x &&
            ballX - ballRadius < brick.x + CONFIG.brickWidth &&
            ballY + ballRadius > brick.y &&
            ballY - ballRadius < brick.y + CONFIG.brickHeight
          ) {
            // hit brick
            brick.active = false;
            localBricksBroken += 1;
            localScoreDelta += 10;

            // simple bounce: flip Y
            velY = -velY;

            if (brick.powerUp) {
              localPowerUps++;

              if (brick.powerUp === "wide") {
                // +25% paddle width each time, with a sane cap
                const nextWidth =
                  paddleWidthRef.current * 1.25;
                const maxWidth = CONFIG.width * 0.9;
                paddleWidthRef.current = Math.min(
                  nextWidth,
                  maxWidth,
                );
              } else if (brick.powerUp === "slow") {
                velX *= 0.7;
                velY *= 0.7;
              }
            }
          }
        }

        if (localBricksBroken > 0) {
          setBricksBroken((prev) => prev + localBricksBroken);
          setScore((prev) => prev + localScoreDelta);
        }
        if (localPowerUps > 0) {
          setPowerUpsCollected(
            (prev) => prev + localPowerUps,
          );
        }

        // all cleared?
        if (activeBricksCount - localBricksBroken <= 0) {
          running = false;
          gameOver = true;
          setIsRunning(false);
          setGameOver(true);
          setAllCleared(true);
        }

        // bottom miss
        if (ballY - ballRadius > height) {
          running = false;
          gameOver = true;
          setIsRunning(false);
          setGameOver(true);
        }

        // update ref
        gameStateRef.current = {
          paddleX,
          ballX,
          ballY,
          velX,
          velY,
          running,
          gameOver,
        };
      }

      // drawing
      ctx.clearRect(0, 0, width, height);

      // background
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        30,
        width / 2,
        height / 2,
        width / 1.2,
      );
      gradient.addColorStop(0, "#020617");
      gradient.addColorStop(0.5, "#0b1120");
      gradient.addColorStop(1, "#020617");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // nebula clouds
      ctx.fillStyle = "rgba(56,189,248,0.05)";
      ctx.beginPath();
      ctx.ellipse(
        width * 0.3,
        height * 0.35,
        80,
        40,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        width * 0.7,
        height * 0.25,
        70,
        32,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // bricks
      for (const brick of bricksRef.current) {
        if (!brick.active) continue;
        const isPower = !!brick.powerUp;

        ctx.fillStyle = isPower ? "#f97316" : "#38bdf8";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = isPower ? 18 : 12;
        ctx.fillRect(
          brick.x,
          brick.y,
          CONFIG.brickWidth,
          CONFIG.brickHeight,
        );
      }
      ctx.shadowBlur = 0;

      // paddle
      ctx.fillStyle = "#22c55e";
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 16;
      ctx.fillRect(
        gameStateRef.current?.paddleX ?? 0,
        height - paddleMarginBottom - paddleHeight,
        paddleWidthRef.current,
        paddleHeight,
      );
      ctx.shadowBlur = 0;

      // ball
      const state2 = gameStateRef.current;
      if (state2) {
        ctx.beginPath();
        ctx.arc(state2.ballX, state2.ballY, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#e5e7eb";
        ctx.shadowColor = "#e5e7eb";
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(drawFrame);
    };

    animationRef.current = requestAnimationFrame(drawFrame);

    return () => {
      if (animationRef.current != null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
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
    e:
      | React.PointerEvent<HTMLDivElement>
      | React.MouseEvent<HTMLDivElement>,
  ) {
    const state = gameStateRef.current;
    if (!state) return;

    const container = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - container.left;
    const scaleX = CONFIG.width / container.width;

    const paddleCenterX = relativeX * scaleX;
    let newPaddleX =
      paddleCenterX - paddleWidthRef.current / 2;

    if (newPaddleX < 0) newPaddleX = 0;
    if (
      newPaddleX + paddleWidthRef.current >
      CONFIG.width
    ) {
      newPaddleX =
        CONFIG.width - paddleWidthRef.current;
    }

    gameStateRef.current = {
      ...(gameStateRef.current as GameState),
      paddleX: newPaddleX,
    };

    if (!state.gameOver) {
      startGameIfNeeded();
    }
  }

  function handleReset() {
    initGameState(); // same level, fresh run
  }

  function handleLevelChange(next: 1 | 2 | 3) {
    if (next === levelRef.current) return;
    setLevel(next);
    initGameState(next);
  }

  async function handleSubmitCompletion() {
    if (submitting) return;
    if (!gameOver) {
      setSubmitError(
        "Finish your run before logging the mission.",
      );
      return;
    }

    const state = gameStateRef.current;
    if (!state) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(
        "/api/bitgalaxy/quests/complete-nebula-break",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            userId,
            questId: "nebula-break",
            level: levelRef.current, // tie into 3-tier XP
            stats: {
              score,
              bricks: bricksBroken,      // new API field
              bricksBroken,              // keep for safety
              powerUpsCollected,
              timeMs: Math.round(elapsedMs),
              cleared: allCleared,
            },
          }),
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to sync completion.");
      }

      setSubmitSuccess(true);

      setTimeout(() => {
        router.push(`/bitgalaxy?userId=${encodeURIComponent(userId)}`);
      }, 900);
    } catch (err: any) {
      console.error("Nebula Break completion error:", err);
      setSubmitError(
        err?.message ||
          "We completed locally, but couldn’t sync with the server. Staff can still verify your progress.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GameQuestShell
      title="Nebula Break"
      subtitle="Shatter the nebula grid. Clear as many bricks as you can and trigger neon power-ups."
      orgId={orgId}
      userId={userId}
    >
      {/* Stats + difficulty header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-sky-500/40 bg-slate-950/95 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-4 text-[11px]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-400/80">
              Time in Field
            </p>
            <p className="mt-1 font-mono text-sm text-sky-100">
              {seconds}s
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-400/80">
              Bricks Broken
            </p>
            <p className="mt-1 font-mono text-sm text-sky-100">
              {bricksBroken}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-400/80">
              Power-Ups
            </p>
            <p className="mt-1 font-mono text-sm text-sky-100">
              {powerUpsCollected}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-400/80">
              Score
            </p>
            <p className="mt-1 font-mono text-sm text-sky-100">
              {score}
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-col items-end gap-2 text-[11px] sm:mt-0">
          {/* difficulty selector */}
          <div className="inline-flex overflow-hidden rounded-full border border-sky-500/40 bg-slate-950/80 text-[10px]">
            <button
              type="button"
              onClick={() => handleLevelChange(1)}
              className={`px-3 py-1 ${
                level === 1
                  ? "bg-sky-500/20 text-sky-100"
                  : "text-sky-200/80 hover:bg-white/5"
              }`}
            >
              Tier 1
            </button>
            <button
              type="button"
              onClick={() => handleLevelChange(2)}
              className={`px-3 py-1 ${
                level === 2
                  ? "bg-sky-500/20 text-sky-100"
                  : "text-sky-200/80 hover:bg-white/5"
              }`}
            >
              Tier 2
            </button>
            <button
              type="button"
              onClick={() => handleLevelChange(3)}
              className={`px-3 py-1 ${
                level === 3
                  ? "bg-sky-500/20 text-sky-100"
                  : "text-sky-200/80 hover:bg-white/5"
              }`}
            >
              Tier 3
            </button>
          </div>

          <div className="flex items-center gap-3">
            {gameOver ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                {allCleared
                  ? "Field cleared – mission log ready"
                  : "Run complete – mission log ready"}
              </span>
            ) : isRunning ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/60 bg-sky-500/10 px-3 py-1 text-sky-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                In the blast zone…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/60 bg-slate-900/80 px-3 py-1 text-slate-200/90">
                Move the paddle to begin
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
      </div>

      {/* Game viewport */}
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
        <p className="mt-3 text-[11px] text-rose-300">
          {submitError}
        </p>
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
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.7)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Syncing…" : "Log mission & award XP"}
        </button>
      </div>
    </GameQuestShell>
  );
}