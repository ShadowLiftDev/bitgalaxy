"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { GameQuestShell } from "./GameQuestShell";

type NeonMemoryGameProps = {
  orgId: string;
  worldName: string;

  memberId: string | null;
  memberName?: string | null;

  isGuest: boolean;
};

type Card = {
  id: number;
  pairId: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
};

type DifficultyLevel = 1 | 2 | 3;

type NeonMemoryCompletionResponse = {
  success?: boolean;
  error?: string;

  result?: {
    weekKey?: string;
    submittedLevel?: number;
    weeklyBestLevel?: number;

    xpAwarded?: number;
    statsImproved?: boolean;

    bestLevel?: number;
    bestMoves?: number | null;
    bestTimeMs?: number | null;
  };
};

const SYMBOLS = [
  "✨",
  "⚡",
  "💿",
  "🌈",
  "🪐",
  "💥",
  "🎮",
  "📀",
  "🔮",
  "🌌",
  "⭐",
  "🎧",
];

const LEVEL_CONFIG: Record<
  DifficultyLevel,
  {
    pairs: number;
  }
> = {
  1: {
    pairs: 8,
  },
  2: {
    pairs: 10,
  },
  3: {
    pairs: 12,
  },
};

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (
    let index = shuffled.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex = Math.floor(
      Math.random() * (index + 1),
    );

    [
      shuffled[index],
      shuffled[randomIndex],
    ] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function buildDeck(
  level: DifficultyLevel,
): Card[] {
  const { pairs } = LEVEL_CONFIG[level];

  const pairCount = Math.min(
    pairs,
    SYMBOLS.length,
  );

  const selectedSymbols =
    SYMBOLS.slice(0, pairCount);

  let idCounter = 0;

  const cards = selectedSymbols.flatMap(
    (symbol, pairId): Card[] => [
      {
        id: idCounter++,
        pairId,
        symbol,
        isFlipped: false,
        isMatched: false,
      },
      {
        id: idCounter++,
        pairId,
        symbol,
        isFlipped: false,
        isMatched: false,
      },
    ],
  );

  return shuffle(cards);
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
  const searchParams = new URLSearchParams({
    orgId,
  });

  if (isGuest) {
    searchParams.set("guest", "1");
  } else if (memberId) {
    searchParams.set("memberId", memberId);
  }

  return `/bitgalaxy/games?${searchParams.toString()}`;
}

export function NeonMemoryGame({
  orgId,
  worldName,
  memberId,
  memberName = null,
  isGuest,
}: NeonMemoryGameProps) {
  const router = useRouter();

  const [cards, setCards] =
    useState<Card[]>([]);

  const [firstIndex, setFirstIndex] =
    useState<number | null>(null);

  const [secondIndex, setSecondIndex] =
    useState<number | null>(null);

  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);

  const [isLocked, setIsLocked] =
    useState(false);

  const [gameCompleted, setGameCompleted] =
    useState(false);

  const [level, setLevel] =
    useState<DifficultyLevel>(1);

  const levelRef =
    useRef<DifficultyLevel>(1);

  const [pairsCount, setPairsCount] =
    useState(
      LEVEL_CONFIG[1].pairs,
    );

  const [elapsedMs, setElapsedMs] =
    useState(0);

  const [isRunning, setIsRunning] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [submitMessage, setSubmitMessage] =
    useState<string | null>(null);

  const allMatched = useMemo(
    () =>
      cards.length > 0 &&
      cards.every(
        (card) => card.isMatched,
      ),
    [cards],
  );

  const seconds = (
    elapsedMs / 1000
  ).toFixed(1);

  const returnHref = buildReturnHref({
    orgId,
    memberId,
    isGuest,
  });

  function initGame(
    nextLevel: DifficultyLevel,
  ) {
    levelRef.current = nextLevel;

    const config =
      LEVEL_CONFIG[nextLevel];

    const deck =
      buildDeck(nextLevel);

    setCards(deck);
    setPairsCount(config.pairs);

    setFirstIndex(null);
    setSecondIndex(null);

    setMoves(0);
    setMatches(0);

    setElapsedMs(0);
    setIsRunning(false);

    setGameCompleted(false);

    setSubmitError(null);
    setSubmitMessage(null);

    setIsLocked(false);
  }

  useEffect(() => {
    initGame(1);
  }, []);

  useEffect(() => {
    if (
      !isRunning ||
      gameCompleted
    ) {
      return;
    }

    const startedAt =
      performance.now() - elapsedMs;

    let animationFrameId = 0;

    const tick = () => {
      setElapsedMs(
        performance.now() -
          startedAt,
      );

      animationFrameId =
        requestAnimationFrame(tick);
    };

    animationFrameId =
      requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(
        animationFrameId,
      );
    };
  }, [isRunning, gameCompleted]);

  useEffect(() => {
    if (
      allMatched &&
      !gameCompleted &&
      cards.length > 0
    ) {
      setGameCompleted(true);
      setIsRunning(false);
    }
  }, [
    allMatched,
    gameCompleted,
    cards.length,
  ]);

  function handleCardClick(
    index: number,
  ) {
    if (
      isLocked ||
      gameCompleted
    ) {
      return;
    }

    const selectedCard =
      cards[index];

    if (
      !selectedCard ||
      selectedCard.isFlipped ||
      selectedCard.isMatched
    ) {
      return;
    }

    if (!isRunning) {
      setIsRunning(true);
    }

    setCards((currentCards) =>
      currentCards.map(
        (card, cardIndex) =>
          cardIndex === index
            ? {
                ...card,
                isFlipped: true,
              }
            : card,
      ),
    );

    if (firstIndex === null) {
      setFirstIndex(index);
      return;
    }

    if (secondIndex !== null) {
      return;
    }

    setSecondIndex(index);
    setMoves(
      (currentMoves) =>
        currentMoves + 1,
    );

    const firstCard =
      cards[firstIndex];

    if (
      firstCard.pairId ===
      selectedCard.pairId
    ) {
      setCards((currentCards) =>
        currentCards.map((card) =>
          card.pairId ===
          selectedCard.pairId
            ? {
                ...card,
                isMatched: true,
              }
            : card,
        ),
      );

      setMatches(
        (currentMatches) =>
          currentMatches + 1,
      );

      window.setTimeout(() => {
        setFirstIndex(null);
        setSecondIndex(null);
      }, 150);

      return;
    }

    setIsLocked(true);

    window.setTimeout(() => {
      setCards((currentCards) =>
        currentCards.map(
          (card, cardIndex) =>
            cardIndex === firstIndex ||
            cardIndex === index
              ? {
                  ...card,
                  isFlipped: false,
                }
              : card,
        ),
      );

      setFirstIndex(null);
      setSecondIndex(null);
      setIsLocked(false);
    }, 600);
  }

  function handleReset() {
    initGame(levelRef.current);
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

    setLevel(nextLevel);
    initGame(nextLevel);
  }

  async function handleSubmitCompletion() {
    if (
      !gameCompleted ||
      submitting
    ) {
      return;
    }

    if (
      isGuest ||
      !memberId
    ) {
      setSubmitMessage(
        "Guest run complete. XP and official records are not saved in guest mode.",
      );

      setSubmitError(null);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);

    try {
      const response = await fetch(
        "/api/bitgalaxy/quests/complete-neon-memory",
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

            level:
              levelRef.current,

            stats: {
              moves,
              timeMs: Math.max(
                1,
                Math.round(elapsedMs),
              ),
              pairs: pairsCount,
            },
          }),
        },
      );

      const json = (await response
        .json()
        .catch(() => ({}))) as NeonMemoryCompletionResponse;

      if (
        !response.ok ||
        !json.success
      ) {
        throw new Error(
          json.error ||
            "Failed to sync Neon Memory completion.",
        );
      }

      const xpAwarded =
        json.result?.xpAwarded ?? 0;

      const statsImproved =
        json.result
          ?.statsImproved === true;

      if (xpAwarded > 0) {
        setSubmitMessage(
          `Mission synced. You earned ${xpAwarded} XP.`,
        );
      } else if (statsImproved) {
        setSubmitMessage(
          "New personal best recorded. This tier’s XP was already earned for the current week.",
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
        "Neon Memory completion error:",
        error,
      );

      setSubmitError(
        error instanceof Error
          ? error.message
          : "The game completed locally, but the result could not be synchronized.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = isGuest
    ? gameCompleted
      ? "Guest run complete"
      : "Finish the grid"
    : submitting
      ? "Syncing…"
      : gameCompleted
        ? "Complete mission"
        : "Finish the grid to complete";

  return (
    <GameQuestShell
      title="Neon Memory"
      subtitle="Flip the neon tiles, find every pair, and reach higher weekly tiers to earn XP."
      orgId={orgId}
      worldName={worldName}
      memberId={memberId}
      memberName={memberName}
      isGuest={isGuest}
      badgeLabel="Arcade Game"
      returnHref={returnHref}
      returnLabel="Back to arcade"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-sky-500/40 bg-slate-950/95 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-4 text-[11px]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-400/80">
              Time
            </p>

            <p className="mt-1 font-mono text-sm text-sky-100">
              {seconds}s
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-400/80">
              Moves
            </p>

            <p className="mt-1 font-mono text-sm text-sky-100">
              {moves}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-400/80">
              Pairs
            </p>

            <p className="mt-1 font-mono text-sm text-sky-100">
              {matches}/{pairsCount}
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-col items-end gap-2 text-[11px] sm:mt-0">
          <div className="inline-flex overflow-hidden rounded-full border border-sky-500/40 bg-slate-950/80 text-[10px]">
            {(
              [1, 2, 3] as DifficultyLevel[]
            ).map(
              (difficultyLevel) => (
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
            {gameCompleted ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                Mission complete
              </span>
            ) : isRunning ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/60 bg-sky-500/10 px-3 py-1 text-sky-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                Scanning grid…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/60 bg-slate-900/80 px-3 py-1 text-slate-200/90">
                Tap a tile to begin
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
              Reset game
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3 sm:gap-4">
        {cards.map(
          (card, index) => {
            const isActive =
              card.isFlipped ||
              card.isMatched;

            return (
              <button
                key={card.id}
                type="button"
                disabled={
                  isLocked ||
                  card.isMatched
                }
                onClick={() =>
                  handleCardClick(
                    index,
                  )
                }
                className={[
                  "flex aspect-square items-center justify-center rounded-2xl border text-2xl transition-all duration-150 sm:text-3xl",

                  isActive
                    ? "border-sky-400/80 bg-sky-500/20 text-sky-50 shadow-[0_0_24px_rgba(56,189,248,0.7)]"
                    : "border-slate-700/80 bg-slate-900/80 text-slate-500 hover:border-sky-500/80 hover:bg-slate-900",

                  card.isMatched
                    ? "border-emerald-400/80 bg-emerald-500/20 text-emerald-100 shadow-[0_0_26px_rgba(52,211,153,0.6)]"
                    : "",

                  isLocked
                    ? "cursor-not-allowed opacity-80"
                    : "",
                ].join(" ")}
              >
                {isActive
                  ? card.symbol
                  : "▢"}
              </button>
            );
          },
        )}
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
            !gameCompleted ||
            submitting
          }
          className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.7)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </GameQuestShell>
  );
}