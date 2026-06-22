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
        amount={record.amount}
        analysis={record.analysis}
        clientName={record.clientName}
        contact={record.contact}
        createdAt={record.createdAt.toISOString()}
        id={record.id}
        intake={record.intake}
        operatorNotes={record.operatorNotes}
        scenario={record.scenario}
        status={record.status}
      />
    </main>
  );
}
