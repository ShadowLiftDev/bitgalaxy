"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { GameQuestShell } from "./GameQuestShell";

type DifficultyLevel = 1 | 2 | 3;

type NebulaBreakGameProps = {
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

  brickRows: number;
  brickCols: number;

  brickWidth: number;
  brickHeight: number;
  brickPadding: number;

  brickOffsetTop: number;
  brickOffsetLeft: number;
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

type NebulaBreakCompletionResponse = {
  success?: boolean;
  error?: string;

  result?: {
    weekKey?: string;

    submittedLevel?: number;
    weeklyBestLevel?: number;

    xpAwarded?: number;
    statsImproved?: boolean;

    bestLevel?: number;
    bestScore?: number | null;
    bestBricks?: number | null;
    bestTimeMs?: number | null;

    cleared?: boolean;
    maximumBricks?: number;
  };
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

function getLevelParams(
  level: DifficultyLevel,
) {
  const rows =
    CONFIG.brickRows +
    (level - 1) * 2;

  const speedScale =
    1 +
    (level - 1) * 0.5;

  return {
    rows,
    speedScale,
    maximumBricks:
      rows * CONFIG.brickCols,
  };
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
  const params =
    new URLSearchParams({
      orgId,
    });

  if (isGuest) {
    params.set("guest", "1");
  } else if (memberId) {
    params.set(
      "memberId",
      memberId,
    );
  }

  return `/bitgalaxy/games?${params.toString()}`;
}

export function NebulaBreakGame({
  orgId,
  worldName,
  memberId,
  memberName = null,
  isGuest,
}: NebulaBreakGameProps) {
  const router = useRouter();

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null,
    );

  const gameStateRef =
    useRef<GameState | null>(
      null,
    );

  const bricksRef =
    useRef<Brick[]>([]);

  const animationRef =
    useRef<number | null>(
      null,
    );

  const paddleWidthRef =
    useRef<number>(
      CONFIG.paddleWidth,
    );

  const levelRef =
    useRef<DifficultyLevel>(1);

  const timerStartRef =
    useRef<number | null>(
      null,
    );

  const [
    bricksBroken,
    setBricksBroken,
  ] = useState(0);

  const [
    powerUpsCollected,
    setPowerUpsCollected,
  ] = useState(0);

  const [score, setScore] =
    useState(0);

  const [
    elapsedMs,
    setElapsedMs,
  ] = useState(0);

  const [
    isRunning,
    setIsRunning,
  ] = useState(false);

  const [
    gameOver,
    setGameOver,
  ] = useState(false);

  const [
    allCleared,
    setAllCleared,
  ] = useState(false);

  const [level, setLevel] =
    useState<DifficultyLevel>(1);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    submitError,
    setSubmitError,
  ] = useState<string | null>(
    null,
  );

  const [
    submitMessage,
    setSubmitMessage,
  ] = useState<string | null>(
    null,
  );

  const seconds = (
    elapsedMs / 1000
  ).toFixed(1);

  const returnHref =
    buildReturnHref({
      orgId,
      memberId,
      isGuest,
    });

  function buildBricks(
    forLevel: DifficultyLevel,
  ) {
    const {
      brickCols,
      brickWidth,
      brickHeight,
      brickPadding,
      brickOffsetTop,
      brickOffsetLeft,
    } = CONFIG;

    const { rows } =
      getLevelParams(
        forLevel,
      );

    const bricks: Brick[] = [];

    for (
      let row = 0;
      row < rows;
      row += 1
    ) {
      for (
        let column = 0;
        column < brickCols;
        column += 1
      ) {
        bricks.push({
          x:
            brickOffsetLeft +
            column *
              (
                brickWidth +
                brickPadding
              ),

          y:
            brickOffsetTop +
            row *
              (
                brickHeight +
                brickPadding
              ),

          active: true,
        });
      }
    }

    if (bricks.length >= 4) {
      bricks[2].powerUp =
        "wide";

      bricks[
        bricks.length - 3
      ].powerUp = "slow";
    }

    bricksRef.current =
      bricks;
  }

  function initGameState(
    forLevel: DifficultyLevel,
  ) {
    levelRef.current =
      forLevel;

    const {
      width,
      height,
      paddleMarginBottom,
      paddleHeight,
      ballRadius,
    } = CONFIG;

    paddleWidthRef.current =
      CONFIG.paddleWidth;

    const startX =
      Math.random() *
        (
          width -
          ballRadius * 2
        ) +
      ballRadius;

    const directionX =
      Math.random() < 0.5
        ? -1
        : 1;

    const { speedScale } =
      getLevelParams(
        forLevel,
      );

    const paddleX =
      (
        width -
        paddleWidthRef.current
      ) / 2;

    gameStateRef.current = {
      paddleX,

      ballX: startX,

      ballY:
        height -
        paddleMarginBottom -
        paddleHeight -
        30,

      velX:
        2.4 *
        speedScale *
        directionX,

      velY:
        -3.2 *
        speedScale,

      running: false,
      gameOver: false,
    };

    buildBricks(
      forLevel,
    );

    setBricksBroken(0);
    setPowerUpsCollected(0);
    setScore(0);
    setElapsedMs(0);

    setIsRunning(false);
    setGameOver(false);
    setAllCleared(false);

    setSubmitError(null);
    setSubmitMessage(null);

    timerStartRef.current =
      null;
  }

  useEffect(() => {
    initGameState(1);
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
      paddleHeight,
      paddleMarginBottom,
      ballRadius,
    } = CONFIG;

    const drawFrame = () => {
      const currentState =
        gameStateRef.current;

      if (!currentState) {
        animationRef.current =
          requestAnimationFrame(
            drawFrame,
          );

        return;
      }

      const bricks =
        bricksRef.current;

      let {
        paddleX,
        ballX,
        ballY,
        velX,
        velY,
        running,
        gameOver:
          currentGameOver,
      } = currentState;

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

        setElapsedMs(
          elapsed,
        );

        ballX += velX;
        ballY += velY;

        if (
          ballX -
            ballRadius <=
          0
        ) {
          ballX =
            ballRadius;

          velX =
            Math.abs(velX);
        } else if (
          ballX +
            ballRadius >=
          width
        ) {
          ballX =
            width -
            ballRadius;

          velX =
            -Math.abs(velX);
        }

        if (
          ballY -
            ballRadius <=
          0
        ) {
          ballY =
            ballRadius;

          velY =
            Math.abs(velY);
        }

        const paddleTopY =
          height -
          paddleMarginBottom -
          paddleHeight;

        const paddleBottomY =
          height -
          paddleMarginBottom;

        const hitPaddle =
          ballY +
            ballRadius >=
            paddleTopY &&
          ballY +
            ballRadius <=
            paddleBottomY &&
          ballX >=
            paddleX &&
          ballX <=
            paddleX +
              paddleWidthRef.current &&
          velY > 0;

        if (hitPaddle) {
          ballY =
            paddleTopY -
            ballRadius;

          velY =
            -Math.abs(velY);

          const hitPosition =
            (
              ballX -
              (
                paddleX +
                paddleWidthRef.current /
                  2
              )
            ) /
            (
              paddleWidthRef.current /
              2
            );

          velX +=
            hitPosition *
            1.5;
        }

        let localBricksBroken =
          0;

        let localScoreDelta =
          0;

        let localPowerUps =
          0;

        let activeBricks =
          0;

        for (
          let index = 0;
          index <
          bricks.length;
          index += 1
        ) {
          const brick =
            bricks[index];

          if (!brick.active) {
            continue;
          }

          activeBricks += 1;

          const hitBrick =
            ballX +
              ballRadius >
              brick.x &&
            ballX -
              ballRadius <
              brick.x +
                CONFIG.brickWidth &&
            ballY +
              ballRadius >
              brick.y &&
            ballY -
              ballRadius <
              brick.y +
                CONFIG.brickHeight;

          if (!hitBrick) {
            continue;
          }

          brick.active =
            false;

          localBricksBroken +=
            1;

          localScoreDelta +=
            10;

          velY = -velY;

          if (brick.powerUp) {
            localPowerUps +=
              1;

            if (
              brick.powerUp ===
              "wide"
            ) {
              const nextWidth =
                paddleWidthRef.current *
                1.25;

              const maxWidth =
                CONFIG.width *
                0.9;

              paddleWidthRef.current =
                Math.min(
                  nextWidth,
                  maxWidth,
                );
            } else if (
              brick.powerUp ===
              "slow"
            ) {
              velX *= 0.7;
              velY *= 0.7;
            }
          }
        }

        if (
          localBricksBroken >
          0
        ) {
          setBricksBroken(
            (current) =>
              current +
              localBricksBroken,
          );

          setScore(
            (current) =>
              current +
              localScoreDelta,
          );
        }

        if (
          localPowerUps > 0
        ) {
          setPowerUpsCollected(
            (current) =>
              current +
              localPowerUps,
          );
        }

        if (
          activeBricks -
            localBricksBroken <=
          0
        ) {
          running = false;
          currentGameOver = true;

          setIsRunning(false);
          setGameOver(true);
          setAllCleared(true);

          setElapsedMs(
            elapsed,
          );
        }

        if (
          ballY -
            ballRadius >
          height
        ) {
          running = false;
          currentGameOver = true;

          setIsRunning(false);
          setGameOver(true);

          setElapsedMs(
            elapsed,
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
        };
      }

      context.clearRect(
        0,
        0,
        width,
        height,
      );

      const gradient =
        context.createRadialGradient(
          width / 2,
          height / 2,
          30,
          width / 2,
          height / 2,
          width / 1.2,
        );

      gradient.addColorStop(
        0,
        "#020617",
      );

      gradient.addColorStop(
        0.5,
        "#0b1120",
      );

      gradient.addColorStop(
        1,
        "#020617",
      );

      context.fillStyle =
        gradient;

      context.fillRect(
        0,
        0,
        width,
        height,
      );

      context.fillStyle =
        "rgba(56,189,248,0.05)";

      context.beginPath();

      context.ellipse(
        width * 0.3,
        height * 0.35,
        80,
        40,
        0,
        0,
        Math.PI * 2,
      );

      context.fill();

      context.beginPath();

      context.ellipse(
        width * 0.7,
        height * 0.25,
        70,
        32,
        0,
        0,
        Math.PI * 2,
      );

      context.fill();

      for (const brick of bricksRef.current) {
        if (!brick.active) {
          continue;
        }

        const isPower =
          Boolean(
            brick.powerUp,
          );

        context.fillStyle =
          isPower
            ? "#f97316"
            : "#38bdf8";

        context.shadowColor =
          context.fillStyle;

        context.shadowBlur =
          isPower
            ? 18
            : 12;

        context.fillRect(
          brick.x,
          brick.y,
          CONFIG.brickWidth,
          CONFIG.brickHeight,
        );
      }

      context.shadowBlur = 0;

      context.fillStyle =
        "#22c55e";

      context.shadowColor =
        "#22c55e";

      context.shadowBlur = 16;

      context.fillRect(
        gameStateRef.current
          ?.paddleX ?? 0,

        height -
          paddleMarginBottom -
          paddleHeight,

        paddleWidthRef.current,
        paddleHeight,
      );

      context.shadowBlur = 0;

      const stateAfterUpdate =
        gameStateRef.current;

      if (stateAfterUpdate) {
        context.beginPath();

        context.arc(
          stateAfterUpdate.ballX,
          stateAfterUpdate.ballY,
          ballRadius,
          0,
          Math.PI * 2,
        );

        context.fillStyle =
          "#e5e7eb";

        context.shadowColor =
          "#e5e7eb";

        context.shadowBlur =
          18;

        context.fill();

        context.closePath();

        context.shadowBlur = 0;
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

    const bounds =
      event.currentTarget.getBoundingClientRect();

    const relativeX =
      event.clientX -
      bounds.left;

    const scaleX =
      CONFIG.width /
      bounds.width;

    const paddleCenterX =
      relativeX *
      scaleX;

    let nextPaddleX =
      paddleCenterX -
      paddleWidthRef.current /
        2;

    if (nextPaddleX < 0) {
      nextPaddleX = 0;
    }

    if (
      nextPaddleX +
        paddleWidthRef.current >
      CONFIG.width
    ) {
      nextPaddleX =
        CONFIG.width -
        paddleWidthRef.current;
    }

    gameStateRef.current = {
      ...state,
      paddleX:
        nextPaddleX,
    };

    if (!state.gameOver) {
      startGameIfNeeded();
    }
  }

  function handleReset() {
    initGameState(
      levelRef.current,
    );
  }

  function handleLevelChange(
    nextLevel: DifficultyLevel,
  ) {
    if (
      nextLevel ===
      levelRef.current
    ) {
      return;
    }

    setLevel(
      nextLevel,
    );

    initGameState(
      nextLevel,
    );
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
        "Guest run complete. XP and official Nebula Break records are not saved in guest mode.",
      );

      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);

    try {
      const response = await fetch(
        "/api/bitgalaxy/quests/complete-nebula-break",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials:
            "include",

          body: JSON.stringify({
            orgId,
            memberId,

            level:
              levelRef.current,

            stats: {
              score,
              bricks:
                bricksBroken,

              timeMs: Math.max(
                1,
                Math.round(
                  elapsedMs,
                ),
              ),

              cleared:
                allCleared,
            },
          }),
        },
      );

      const json = (await response
        .json()
        .catch(() => ({}))) as NebulaBreakCompletionResponse;

      if (
        !response.ok ||
        !json.success
      ) {
        throw new Error(
          json.error ||
            "Failed to sync Nebula Break completion.",
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
        levelRef.current;

      if (xpAwarded > 0) {
        setSubmitMessage(
          `Tier ${submittedLevel} synced. You earned ${xpAwarded} XP.`,
        );
      } else if (statsImproved) {
        setSubmitMessage(
          "New Nebula Break personal best recorded. This tier’s XP was already earned for the current week.",
        );
      } else {
        setSubmitMessage(
          "Run recorded. No additional XP was available for this tier.",
        );
      }

      window.setTimeout(() => {
        router.push(
          returnHref,
        );

        router.refresh();
      }, 1200);
    } catch (
      error: unknown
    ) {
      console.error(
        "Nebula Break completion error:",
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

  const submitLabel =
    isGuest
      ? gameOver
        ? "Guest run complete"
        : "Finish a run"
      : submitting
        ? "Syncing…"
        : gameOver
          ? `Log Tier ${level}`
          : "Finish a run to log XP";

  return (
    <GameQuestShell
      title="Nebula Break"
      subtitle="Shatter the nebula grid. Clear as many bricks as you can and trigger neon power-ups."
      badgeLabel="Arcade Game"
      orgId={orgId}
      worldName={worldName}
      memberId={memberId}
      memberName={
        memberName
      }
      isGuest={isGuest}
      returnHref={
        returnHref
      }
      returnLabel="Back to arcade"
    >
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
          <div className="inline-flex overflow-hidden rounded-full border border-sky-500/40 bg-slate-950/80 text-[10px]">
            {(
              [
                1,
                2,
                3,
              ] as DifficultyLevel[]
            ).map(
              (
                difficultyLevel,
              ) => (
                <button
                  key={
                    difficultyLevel
                  }
                  type="button"
                  onClick={() =>
                    handleLevelChange(
                      difficultyLevel,
                    )
                  }
                  className={`px-3 py-1 ${
                    level ===
                    difficultyLevel
                      ? "bg-sky-500/20 text-sky-100"
                      : "text-sky-200/80 hover:bg-white/5"
                  }`}
                >
                  Tier{" "}
                  {difficultyLevel}
                </button>
              ),
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {gameOver ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />

                {allCleared
                  ? "Field cleared"
                  : "Run complete"}
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

            {isGuest && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-500/10 px-3 py-1 text-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />

                Guest mode
              </span>
            )}

            <button
              type="button"
              onClick={
                handleReset
              }
              className="text-[10px] text-sky-300/80 underline-offset-2 hover:text-sky-200 hover:underline"
            >
              Reset run
            </button>
          </div>
        </div>
      </div>

      <div
        className="mt-4 flex justify-center"
        onPointerMove={
          handlePointerMove
        }
        onMouseMove={
          handlePointerMove
        }
      >
        <div className="relative w-full max-w-xs touch-pan-x">
          <div className="aspect-[8/11] overflow-hidden rounded-2xl border border-sky-500/40 bg-slate-900 shadow-[0_0_40px_rgba(56,189,248,0.4)]">
            <canvas
              ref={canvasRef}
              width={
                CONFIG.width
              }
              height={
                CONFIG.height
              }
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