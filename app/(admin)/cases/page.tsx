import { CaseTable } from "@/components/case-table";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const cases = await prisma.case.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <main className="page-shell workbench-shell">
      <CaseTable cases={cases} />
    </main>
  );
}
