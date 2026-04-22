import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const report = await prisma.monthlyReport.findUnique({ where: { id } });
  if (!report) return Response.json({ error: "Report not found" }, { status: 404 });
  if (report.status === "APPROVED") return Response.json({ error: "Cannot delete an approved report" }, { status: 400 });

  await prisma.monthlyReportEntry.deleteMany({ where: { reportId: id } });
  await prisma.monthlyReport.delete({ where: { id } });

  return Response.json({ success: true });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const report = await prisma.monthlyReport.findUnique({
    where: { id },
    include: {
      entries: {
        include: {
          participant: {
            select: {
              tskId: true, surname: true, fullNames: true, knownAs: true,
              dateOfBirth: true, gender: true, isAssistantCoach: true,
            },
          },
        },
        orderBy: { percentage: "desc" },
      },
    },
  });

  if (!report) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(report);
}
