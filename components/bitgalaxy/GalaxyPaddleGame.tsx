"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { GameQuestShell } from "./GameQuestShell";

type GalaxyPaddleGameProps = {
  orgId: string;
  worldName: string;

  memberId: string | null;
  memberName?: string | null;

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

type DifficultyLevel = 1 | 2 | 3;

type GalaxyPaddleCompletionResponse = {
  success?: boolean;
  error?: string;

  result?: {
    weekKey?: string;

    requestedLevel?: number;
    justifiedLevel?: number;
    submittedLevel?: number;

    weeklyBestLevel?: number;

    xpAwarded?: number;
    statsImproved?: boolean;

    bestLevel?: number;
    bestHits?: number | null;
    bestTimeMs?: number | null;
    bestMaxSpeed?: number | null;
  };
};

const CONFIG: GameConfig = {
  width: 320,
  height: 440,

  paddleWidth: 80,
  paddleHeight: 10,
  paddleMarginBottom: 24,

  ballRadius: 8,
};

function computeTierFromStats(
  hits: number,
  elapsedMs: number,
): DifficultyLevel {
  const seconds = elapsedMs / 1000;

  if (
    seconds >= 45 ||
    hits >= 30
  ) {
    return 3;
  }

  if (
    seconds >= 25 ||
    hits >= 15
  ) {
    return 2;
  }

  return 1;
}

function buildReturnHref({
  orgId,
  memberId,
  isGuest,
}: {
  orgId: string;
  memberId: string | null;
  isGuest: boolean;
}): string {
  const searchParams =
    new URLSearchParams({
      orgId,
    });

  if (isGuest) {
    searchParams.set("guest", "1");
  } else if (memberId) {
    searchParams.set(
      "memberId",
      memberId,
    );
  }

  return `/bitgalaxy/games?${searchParams.toString()}`;
}

export function GalaxyPaddleGame({
  orgId,
  worldName,
  memberId,
  memberName = null,
  isGuest,
}: GalaxyPaddleGameProps) {
  const router = useRouter();

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null,
    );

  const gameStateRef =
    useRef<GameState | null>(null);

  const animationRef =
    useRef<number | null>(null);

  const timerStartRef =
    useRef<number | null>(null);

  const [hits, setHits] =
    useState(0);

  const [maxSpeed, setMaxSpeed] =
    useState(0);

  const [elapsedMs, setElapsedMs] =
    useState(0);

  const [isRunning, setIsRunning] =
    useState(false);

  const [gameOver, setGameOver] =
    useState(false);

  const [tier, setTier] =
    useState<DifficultyLevel>(1);

  const [submitting, setSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [submitMessage, setSubmitMessage] =
    useState<string | null>(null);

  const seconds = (
    elapsedMs / 1000
  ).toFixed(1);

  const returnHref = buildReturnHref({
    orgId,
    memberId,
    isGuest,
  });

  function initGameState() {
    const {
      width,
      height,
      paddleWidth,
    } = CONFIG;

    const paddleX =
      (width - paddleWidth) / 2;

    const initialSpeed = Math.sqrt(
      2.2 * 2.2 +
        3.0 * 3.0,
    );

    gameStateRef.current = {
      paddleX,

      ballX: width / 2,
      ballY: height / 2,

      velX: 2.2,
      velY: -3,

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
    setSubmitMessage(null);

    timerStartRef.current = null;
  }

  useEffect(() => {
    initGameState();
  }, []);

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    const {
      width,
      height,

      paddleWidth,
      paddleHeight,
      paddleMarginBottom,

      ballRadius,
    } = CONFIG;

    const drawFrame = () => {
      const state =
        gameStateRef.current;

      if (!state) {
        animationRef.current =
          requestAnimationFrame(
            drawFrame,
          );

        return;
      }

      let {
        paddleX,

        ballX,
        ballY,

        velX,
        velY,

        running,
        gameOver: currentGameOver,

        hits: currentHits,
        maxSpeed: currentMaxSpeed,
      } = state;

      const now =
        performance.now();

      if (
        running &&
        !currentGameOver
      ) {
        if (
          timerStartRef.current ===
          null
        ) {
          timerStartRef.current =
            now;
        }

        const elapsed =
          now -
          timerStartRef.current;

        setElapsedMs(elapsed);

        ballX += velX;
        ballY += velY;

        if (
          ballX - ballRadius <=
          0
        ) {
          ballX = ballRadius;
          velX = Math.abs(velX);
        } else if (
          ballX + ballRadius >=
          width
        ) {
          ballX =
            width - ballRadius;

          velX =
            -Math.abs(velX);
        }

        if (
          ballY - ballRadius <=
          0
        ) {
          ballY = ballRadius;
          velY = Math.abs(velY);
        }

        const paddleTopY =
          height -
          paddleMarginBottom -
          paddleHeight;

        const paddleBottomY =
          height -
          paddleMarginBottom;

        const hitPaddle =
          ballY + ballRadius >=
            paddleTopY &&
          ballY + ballRadius <=
            paddleBottomY &&
          ballX >= paddleX &&
          ballX <=
            paddleX + paddleWidth &&
          velY > 0;

        if (hitPaddle) {
          ballY =
            paddleTopY -
            ballRadius;

          velY =
            -Math.abs(velY);

          const hitPosition =
            (ballX -
              (paddleX +
                paddleWidth / 2)) /
            (paddleWidth / 2);

          velX +=
            hitPosition * 1.4;

          const speed = Math.sqrt(
            velX * velX +
              velY * velY,
          );

          const nextSpeed =
            speed * 1.04;

          const normalizedX =
            velX / speed;

          const normalizedY =
            velY / speed;

          velX =
            normalizedX *
            nextSpeed;

          velY =
            normalizedY *
            nextSpeed;

          currentHits += 1;

          currentMaxSpeed =
            Math.max(
              currentMaxSpeed,
              nextSpeed,
            );

          setHits(currentHits);

          setMaxSpeed(
            currentMaxSpeed,
          );
        }

        if (
          ballY - ballRadius >
          height
        ) {
          running = false;
          currentGameOver = true;

          setIsRunning(false);
          setGameOver(true);

          const finalElapsed =
            timerStartRef.current !==
            null
              ? now -
                timerStartRef.current
              : elapsed;

          setElapsedMs(
            finalElapsed,
          );

          const computedTier =
            computeTierFromStats(
              currentHits,
              finalElapsed,
            );

          setTier(
            computedTier,
          );
        }

        gameStateRef.current = {
          paddleX,

          ballX,
          ballY,

          velX,
          velY,

          running,
          gameOver:
            currentGameOver,

          hits: currentHits,
          maxSpeed:
            currentMaxSpeed,
        };
      }

      context.clearRect(
        0,
        0,
        width,
        height,
      );

      const gradient =
        context.createLinearGradient(
          0,
          0,
          width,
          height,
        );

      gradient.addColorStop(
        0,
        "#020617",
      );

      gradient.addColorStop(
        1,
        "#0f172a",
      );

      context.fillStyle =
        gradient;

      context.fillRect(
        0,
        0,
        width,
        height,
      );

      context.strokeStyle =
        "rgba(56,189,248,0.10)";

      context.lineWidth = 1;

      const gridSize = 40;

      for (
        let y = height;
        y > 0;
        y -= gridSize
      ) {
        context.beginPath();

        context.moveTo(0, y);

        context.lineTo(
          width,
          y - gridSize / 2,
        );

        context.stroke();
      }

      context.fillStyle =
        "#38bdf8";

      context.shadowColor =
        "#38bdf8";

      context.shadowBlur = 16;

      context.fillRect(
        paddleX,
        height -
          paddleMarginBottom -
          paddleHeight,
        paddleWidth,
        paddleHeight,
      );

      context.shadowBlur = 0;

      context.beginPath();

      context.arc(
        ballX,
        ballY,
        ballRadius,
        0,
        Math.PI * 2,
      );

      context.fillStyle =
        "#f97316";

      context.shadowColor =
        "#f97316";

      context.shadowBlur = 18;

      context.fill();

      context.closePath();

      context.shadowBlur = 0;

      context.fillStyle =
        "rgba(148,163,184,0.4)";

      for (
        let index = 0;
        index < 16;
        index += 1
      ) {
        const starX =
          (index * 23) %
          width;

        const starY =
          (index * 53 +
            (now / 35) %
              height) %
          height;

        context.fillRect(
          starX,
          starY,
          1,
          1,
        );
      }

      animationRef.current =
        requestAnimationFrame(
          drawFrame,
        );
    };

    animationRef.current =
      requestAnimationFrame(
        drawFrame,
      );

    return () => {
      if (
        animationRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationRef.current,
        );
      }
    };
  }, []);

  function startGameIfNeeded() {
    const state =
      gameStateRef.current;

    if (!state) {
      return;
    }

    if (
      !state.running &&
      !state.gameOver
    ) {
      gameStateRef.current = {
        ...state,
        running: true,
      };

      setIsRunning(true);

      timerStartRef.current =
        performance.now();
    }
  }

  function handlePointerMove(
    event:
      | React.PointerEvent<HTMLDivElement>
      | React.MouseEvent<HTMLDivElement>,
  ) {
    const state =
      gameStateRef.current;

    if (!state) {
      return;
    }

    const container =
      event.currentTarget.getBoundingClientRect();

    const relativeX =
      event.clientX -
      container.left;

    const scaleX =
      CONFIG.width /
      container.width;

    const paddleCenterX =
      relativeX * scaleX;

    let nextPaddleX =
      paddleCenterX -
      CONFIG.paddleWidth / 2;

    if (nextPaddleX < 0) {
      nextPaddleX = 0;
    }

    if (
      nextPaddleX +
        CONFIG.paddleWidth >
      CONFIG.width
    ) {
      nextPaddleX =
        CONFIG.width -
        CONFIG.paddleWidth;
    }

    gameStateRef.current = {
      ...state,
      paddleX: nextPaddleX,
    };

    if (!state.gameOver) {
      startGameIfNeeded();
    }
  }

  function handleReset() {
    initGameState();
  }

  async function handleSubmitCompletion() {
    if (
      submitting ||
      !gameOver
    ) {
      return;
    }

    if (
      isGuest ||
      !memberId
    ) {
      setSubmitError(null);

      setSubmitMessage(
        "Guest run complete. XP and official Galaxy Paddle records are not saved in guest mode.",
      );

      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);

    try {
      const response = await fetch(
        "/api/bitgalaxy/quests/complete-galaxy-paddle",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            orgId,
            memberId,

            level: tier,

            stats: {
              hits,

              timeMs: Math.max(
                1,
                Math.round(
                  elapsedMs,
                ),
              ),

              maxSpeed,
            },
          }),
        },
      );

      const json = (await response
        .json()
        .catch(() => ({}))) as GalaxyPaddleCompletionResponse;

      if (
        !response.ok ||
        !json.success
      ) {
        throw new Error(
          json.error ||
            "Failed to sync Galaxy Paddle completion.",
        );
      }

      const xpAwarded =
        json.result?.xpAwarded ??
        0;

      const statsImproved =
        json.result
          ?.statsImproved === true;

      const submittedLevel =
        json.result
          ?.submittedLevel ??
        tier;

      if (xpAwarded > 0) {
        setSubmitMessage(
          `Tier ${submittedLevel} synced. You earned ${xpAwarded} XP.`,
        );
      } else if (statsImproved) {
        setSubmitMessage(
          "New Galaxy Paddle personal best recorded. This tier’s XP was already earned for the current week.",
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
        "Galaxy Paddle completion error:",
        error,
      );

      setSubmitError(
        error instanceof Error
          ? error.message
          : "The run completed locally, but the result could not be synchronized.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = isGuest
    ? gameOver
      ? "Guest run complete"
      : "Finish a run"
    : submitting
      ? "Syncing…"
      : gameOver
        ? `Log Tier ${tier}`
        : "Finish a run to log XP";

  return (
    <GameQuestShell
      badgeLabel="Arcade Game"
      title="Galaxy Paddle"
      subtitle="Hold the defensive line. Keep the neon core in play as long as you can."
      orgId={orgId}
      worldName={worldName}
      memberId={memberId}
      memberName={memberName}
      isGuest={isGuest}
      returnHref={returnHref}
      returnLabel="Back to arcade"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-sky-500/40 bg-slate-950/95 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-4 text-[11px]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-400/80">
              Time Online
            </p>

            <p className="mt-1 font-mono text-sm text-sky-100">
              {seconds}s
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-400/80">
              Returns
            </p>

            <p className="mt-1 font-mono text-sm text-sky-100">
              {hits}
            </p>
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

            <p className="mt-1 font-mono text-sm text-sky-100">
              {tier}
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-col items-start gap-2 text-[11px] sm:mt-0 sm:flex-row sm:items-center sm:gap-3">
          {gameOver ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/60 bg-rose-500/10 px-3 py-1 text-rose-200">
              <span className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_12px_rgba(248,113,113,0.8)]" />

              Run complete — Tier {tier}
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

              Guest mode
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

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={
            handleSubmitCompletion
          }
          disabled={
            submitting ||
            !gameOver
          }
          className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.7)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </GameQuestShell>
  );
}