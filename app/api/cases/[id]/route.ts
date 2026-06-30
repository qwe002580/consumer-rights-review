import { NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/admin-request-auth";
import { prisma } from "@/lib/db";
import { caseUpdateSchema } from "@/lib/schema";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_CASE_UPDATE", details: "请求内容格式不正确。" },
      { status: 400 }
    );
  }
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
