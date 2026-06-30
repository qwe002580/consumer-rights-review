import { notFound } from "next/navigation";
import { CaseDetail } from "@/components/case-detail";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await prisma.case.findUnique({
    where: {
      id
    }
  });

  if (!record) {
    notFound();
  }

  return (
    <main className="page-shell">
      <CaseDetail
        addedWechat={record.addedWechat}
        addedWechatAt={record.addedWechatAt?.toISOString() ?? null}
        amount={record.amount}
        analysis={record.analysis}
        assessmentNo={record.assessmentNo}
        clientName={record.clientName}
        contact={record.contact}
        contactTime={record.contactTime}
        createdAt={record.createdAt.toISOString()}
        id={record.id}
        intake={record.intake}
        leadScore={record.leadScore}
        merchantName={record.merchantName}
        merchantPromise={record.merchantPromise}
        operatorNotes={record.operatorNotes}
        phone={record.phone}
        receiveMethod={record.receiveMethod}
        scenario={record.scenario}
        status={record.status}
        wechatId={record.wechatId}
        willingToSupplement={record.willingToSupplement}
      />
    </main>
  );
}
