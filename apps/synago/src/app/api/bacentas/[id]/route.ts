import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db, bacentas } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { canCreateBacenta } from "@qcc/core/permissions";
import { getBacentaScope } from "@qcc/core/scope";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const leader = await requireLeader();
    const { id } = await params;

    const scope = id ? await getBacentaScope(id) : null;
    if (
      !scope ||
      !canCreateBacenta(leader, {
        governorshipId: scope.governorshipId,
        councilId: scope.councilId,
      })
    ) {
      return NextResponse.json(
        { error: "You cannot delete this bacenta." },
        { status: 403 }
      );
    }

    await db.delete(bacentas).where(eq(bacentas.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bacenta:", error);
    return NextResponse.json(
      { error: "Failed to delete bacenta" },
      { status: 500 }
    );
  }
}
