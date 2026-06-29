import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const assessmentNo =
    json && typeof json === "object" && "assessmentNo" in json
      ? String((json as { assessmentNo?: unknown }).assessmentNo ?? "").trim()
      : "";

  if (!assessmentNo) {
    return NextResponse.json({ error: "INVALID_ASSESSMENT" }, { status: 400 });
  }

  const record = await prisma.case.findUnique({
    where: { id },
    select: {
      id: true,
      assessmentNo: true,
      addedWechat: true
    }
  });

  if (!record || record.assessmentNo !== assessmentNo) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (!record.addedWechat) {
    await prisma.case.update({
      where: { id },
      data: {
        addedWechat: true,
        addedWechatAt: new Date()
      }
    });
  }

  return NextResponse.json({ addedWechat: true }, { status: 200 });
}
