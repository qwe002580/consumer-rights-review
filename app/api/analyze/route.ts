import { NextResponse } from "next/server";
import { analyzeIntake } from "@/lib/analysis";
import { generateAssessmentNumber } from "@/lib/assessment-number";
import { prisma } from "@/lib/db";
import { calculateLeadScore } from "@/lib/lead-score";
import { toPublicAnalysis } from "@/lib/public-analysis";
import { intakeSchema } from "@/lib/schema";
import { sendNewCaseNotification } from "@/lib/wecom-case-notification";

const MAX_ASSESSMENT_NUMBER_ATTEMPTS = 5;

function isAssessmentNumberConflict(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybePrismaError = error as { code?: unknown; meta?: { target?: unknown } };
  if (maybePrismaError.code !== "P2002") return false;

  const target = maybePrismaError.meta?.target;
  return Array.isArray(target)
    ? target.includes("assessmentNo")
    : target === "assessmentNo";
}

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
  const leadScore = calculateLeadScore(parsed.data);

  try {
    let record;
    let assessmentNo = "";

    for (let attempt = 1; attempt <= MAX_ASSESSMENT_NUMBER_ATTEMPTS; attempt += 1) {
      try {
        assessmentNo = generateAssessmentNumber();
        record = await prisma.case.create({
          data: {
            assessmentNo,
            clientName: parsed.data.clientName,
            contact: parsed.data.contact,
            scenario: parsed.data.scenario,
            amount: parsed.data.amount,
            purchaseDate: new Date(parsed.data.purchaseDate),
            paymentMethod: parsed.data.paymentMethod,
            stage: parsed.data.stage,
            goal: parsed.data.goal,
            receiveMethod: parsed.data.receiveMethod,
            wechatId: parsed.data.wechatId,
            phone: parsed.data.phone,
            contactTime: parsed.data.contactTime,
            merchantName: parsed.data.merchantName,
            merchantPromise: parsed.data.merchantPromise,
            willingToSupplement: parsed.data.willingToSupplement,
            leadScore: leadScore.grade,
            intake: parsed.data,
            analysis,
            reviewFlag: analysis.review_flag,
            status: "new"
          }
        });
        break;
      } catch (error) {
        if (
          attempt < MAX_ASSESSMENT_NUMBER_ATTEMPTS &&
          isAssessmentNumberConflict(error)
        ) {
          continue;
        }
        throw error;
      }
    }

    if (!record) throw new Error("Failed to save case");

    const siteUrl =
      process.env.PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;

    await sendNewCaseNotification({
      id: record.id,
      assessmentNo,
      leadScore: record.leadScore,
      receiveMethod: record.receiveMethod,
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
        assessmentNo,
        leadScore: record.leadScore,
        analysis: toPublicAnalysis(analysis)
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
