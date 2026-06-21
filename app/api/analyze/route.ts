import { NextResponse } from "next/server";
import { analyzeIntake } from "@/lib/analysis";
import { prisma } from "@/lib/db";
import { intakeSchema } from "@/lib/schema";
import { sendNewCaseNotification } from "@/lib/wecom-case-notification";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = intakeSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_INTAKE",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const analysis = await analyzeIntake(parsed.data);

  try {
    const record = await prisma.case.create({
      data: {
        clientName: parsed.data.clientName,
        contact: parsed.data.contact,
        scenario: parsed.data.scenario,
        amount: parsed.data.amount,
        purchaseDate: new Date(parsed.data.purchaseDate),
        paymentMethod: parsed.data.paymentMethod,
        stage: parsed.data.stage,
        goal: parsed.data.goal,
        intake: parsed.data,
        analysis,
        reviewFlag: analysis.review_flag,
        status: "new"
      }
    });

    const siteUrl =
      process.env.PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;

    await sendNewCaseNotification({
      id: record.id,
      scenario: record.scenario,
      amount: record.amount,
      stage: record.stage,
      reviewFlag: record.reviewFlag,
      createdAt: record.createdAt,
      siteUrl
    });

    return NextResponse.json(
      {
        id: record.id,
        analysis
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "CASE_SAVE_FAILED",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
