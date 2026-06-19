import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { caseUpdateSchema } from "@/lib/schema";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const json = await request.json();
  const parsed = caseUpdateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_CASE_UPDATE",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  try {
    const record = await prisma.case.update({
      where: {
        id
      },
      data: parsed.data
    });

    return NextResponse.json({ id: record.id, status: record.status }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "CASE_UPDATE_FAILED",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
