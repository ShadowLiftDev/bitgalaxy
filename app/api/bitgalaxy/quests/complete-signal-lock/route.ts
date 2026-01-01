import { NextRequest, NextResponse } from "next/server";
import { getActiveQuests } from "@/lib/bitgalaxy/getActiveQuests";
import { getPlayer } from "@/lib/bitgalaxy/getPlayer";
import { getRankProgress } from "@/lib/bitgalaxy/rankEngine";
import { requireUser } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { updateXP } from "@/lib/bitgalaxy/updateXP";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orgId = body.orgId as string | undefined;
    const targetUserId = body.userId as string | undefined;

    if (!orgId || !targetUserId) {
      return NextResponse.json(
        { error: "Missing orgId or userId" },
        { status: 400 },
      );
    }

    const actingUser = await requireUser(req);
    if (actingUser.uid !== targetUserId) {
      return NextResponse.json(
        { error: "You can only complete Signal Lock for your own profile." },
        { status: 403 },
      );
    }

    const playerRef = adminDb
      .collection("orgs")
      .doc(orgId)
      .collection("bitgalaxyPlayers")
      .doc(targetUserId);

    const now = FieldValue.serverTimestamp() as Timestamp;

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(playerRef);
      if (!snap.exists) {
        throw new Error(
          `Signal Lock: player ${targetUserId} does not exist in org ${orgId}`,
        );
      }

      const data = (snap.data() || {}) as any;
      const specialEvents = (data.specialEvents || {}) as any;

      if (specialEvents.signalLockCompleted) {
        throw new Error("SIGNAL_LOCK_ALREADY_COMPLETED");
      }

      tx.set(
        playerRef,
        {
          specialEvents: {
            ...specialEvents,
            signalLockCompleted: true,
          },
          updatedAt: now,
        },
        { merge: true },
      );
    });

    const tutorialXP = 50;
    await updateXP(orgId, targetUserId, tutorialXP, {
      source: "signal_lock_tutorial",
      questId: "signal-lock",
    });

    const [activeQuests, player] = await Promise.all([
      getActiveQuests(orgId, targetUserId),
      getPlayer(orgId, targetUserId),
    ]);

    const progress = getRankProgress(player.totalXP);

    return NextResponse.json({
      success: true,
      tutorialXP,
      activeQuests,
      player: {
        userId: player.userId,
        orgId: player.orgId,
        totalXP: player.totalXP,
        rank: player.rank,

        // ✅ new
        level: (player as any).level ?? 1,
        weeklyXP: (player as any).weeklyXP ?? 0,
        weeklyWeekKey: (player as any).weeklyWeekKey ?? "",

        progress,
      },
    });
  } catch (error: any) {
    console.error("BitGalaxy complete-signal-lock error:", error);

    if (error?.message === "SIGNAL_LOCK_ALREADY_COMPLETED") {
      return NextResponse.json(
        { error: "Signal Lock already completed for this player" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error?.message ?? "Failed to complete Signal Lock quest" },
      { status: 500 },
    );
  }
}