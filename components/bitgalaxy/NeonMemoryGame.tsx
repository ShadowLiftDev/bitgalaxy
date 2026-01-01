"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GameQuestShell } from "./GameQuestShell";

type NeonMemoryGameProps = {
  orgId: string;
  userId: string;
};

type Card = {
  id: number;
  pairId: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
};

type DifficultyLevel = 1 | 2 | 3;

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

const LEVEL_CONFIG: Record<DifficultyLevel, { pairs: number }> = {
  1: { pairs: 8 },  // 4x4 grid (16 cards)
  2: { pairs: 10 }, // 5 rows x 4 cols (20 cards)
  3: { pairs: 12 }, // 6 rows x 4 cols (24 cards)
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(level: DifficultyLevel): Card[] {
  const { pairs } = LEVEL_CONFIG[level];
  const maxPairs = Math.min(pairs, Math.floor(SYMBOLS.length));
  const selectedSymbols = SYMBOLS.slice(0, maxPairs);

  let idCounter = 0;
  const cards: Card[] = selectedSymbols.flatMap((symbol, pairId) => [
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
  ]);

  return shuffle(cards);
}

export function NeonMemoryGame({ orgId, userId }: NeonMemoryGameProps) {
  const router = useRouter();

  const [cards, setCards] = useState<Card[]>([]);
  const [firstIndex, setFirstIndex] = useState<number | null>(null);
  const [secondIndex, setSecondIndex] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  // difficulty
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const levelRef = useRef<DifficultyLevel>(1);
  const [pairsCount, setPairsCount] = useState(
    LEVEL_CONFIG[1].pairs,
  );

  // timer
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(
    null,
  );
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // derived
  const allMatched = useMemo(
    () => cards.length > 0 && cards.every((c) => c.isMatched),
    [cards],
  );

  const seconds = (elapsedMs / 1000).toFixed(1);

  function initGame(forLevel: DifficultyLevel) {
    levelRef.current = forLevel;
    const config = LEVEL_CONFIG[forLevel];
    const deck = buildDeck(forLevel);

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
    setSubmitSuccess(false);
    setIsLocked(false);
  }

  // initialize cards (Tier 1 default)
  useEffect(() => {
    initGame(1);
  }, []);

  // timer effect
  useEffect(() => {
    if (!isRunning || gameCompleted) return;

    const start = performance.now() - elapsedMs;
    let frameId: number;

    const tick = () => {
      const now = performance.now();
      setElapsedMs(now - start);
      if (!gameCompleted && isRunning) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, gameCompleted]);

  // detect completion
  useEffect(() => {
    if (allMatched && !gameCompleted && cards.length > 0) {
      setGameCompleted(true);
      setIsRunning(false);
    }
  }, [allMatched, gameCompleted, cards.length]);

  function handleCardClick(index: number) {
    if (isLocked || gameCompleted) return;

    const card = cards[index];
    if (card.isFlipped || card.isMatched) return;

    // start timer on first action
    if (!isRunning) {
      setIsRunning(true);
    }

    // flip card
    setCards((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, isFlipped: true } : c,
      ),
    );

    if (firstIndex === null) {
      setFirstIndex(index);
      return;
    }

    if (secondIndex === null) {
      // second selection
      setSecondIndex(index);
      setMoves((m) => m + 1);
      const firstCard = cards[firstIndex];

      if (firstCard.pairId === card.pairId) {
        // match
        setCards((prev) =>
          prev.map((c) =>
            c.pairId === card.pairId ? { ...c, isMatched: true } : c,
          ),
        );
        setMatches((m) => m + 1);
        // clear selections without delay
        setTimeout(() => {
          setFirstIndex(null);
          setSecondIndex(null);
        }, 150);
      } else {
        // mismatch – briefly show both
        setIsLocked(true);
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === firstIndex || i === index
                ? { ...c, isFlipped: false }
                : c,
            ),
          );
          setFirstIndex(null);
          setSecondIndex(null);
          setIsLocked(false);
        }, 600);
      }
    }
  }

  function handleReset() {
    initGame(levelRef.current);
  }

  function handleLevelChange(next: DifficultyLevel) {
    if (next === levelRef.current) return;
    setLevel(next);
    initGame(next);
  }

  async function handleSubmitCompletion() {
    if (!gameCompleted || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(
        "/api/bitgalaxy/quests/complete-neon-memory",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            userId,
            questId: "neon-memory",
            level: levelRef.current, // tie into 3-tier XP
            stats: {
              moves,
              timeMs: Math.round(elapsedMs),
              pairs: pairsCount,
            },
          }),
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to sync completion.");
      }

      setSubmitSuccess(true);

      // route back to main BitGalaxy dashboard
      setTimeout(() => {
        router.push(
          `/bitgalaxy?userId=${encodeURIComponent(userId)}`,
        );
      }, 900);
    } catch (err: any) {
      console.error("Neon Memory completion error:", err);
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
      title="Neon Memory"
      subtitle="Flip the neon tiles, find all the pairs, and complete the mission to earn XP."
      orgId={orgId}
      userId={userId}
    >
      {/* Top stats bar + difficulty selector */}
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

      {/* Grid */}
      <div className="mt-4 grid grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card, index) => {
          const isActive = card.isFlipped || card.isMatched;
          return (
            <button
              key={card.id}
              type="button"
              disabled={isLocked || card.isMatched}
              onClick={() => handleCardClick(index)}
              className={[
                "aspect-square rounded-2xl border transition-all duration-150",
                "flex items-center justify-center text-2xl sm:text-3xl",
                isActive
                  ? "border-sky-400/80 bg-sky-500/20 shadow-[0_0_24px_rgba(56,189,248,0.7)] text-sky-50"
                  : "border-slate-700/80 bg-slate-900/80 text-slate-500 hover:border-sky-500/80 hover:bg-slate-900",
                card.isMatched
                  ? "border-emerald-400/80 bg-emerald-500/20 text-emerald-100 shadow-[0_0_26px_rgba(52,211,153,0.6)]"
                  : "",
                isLocked ? "cursor-not-allowed opacity-80" : "",
              ].join(" ")}
            >
              {isActive ? card.symbol : "▢"}
            </button>
          );
        })}
      </div>

      {/* Messages */}
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

      {/* Complete mission button */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSubmitCompletion}
          disabled={!gameCompleted || submitting}
          className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.7)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? "Syncing…"
            : gameCompleted
            ? "Complete mission"
            : "Finish the grid to complete"}
        </button>
      </div>
    </GameQuestShell>
  );
}