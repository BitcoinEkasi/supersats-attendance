import { requireAuth } from "@/lib/api-auth";
import { getSASTNow } from "@/lib/sast";
import { getTopupSettings, computeTopupForecast, buildTopupEmail } from "@/lib/topup-forecast";

/** Preview of this month's top-up forecast — computes only, never sends. */
export async function GET() {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getTopupSettings();
  const { year, month: m } = getSASTNow();
  const month = `${year}-${String(m).padStart(2, "0")}`;
  const forecast = await computeTopupForecast(month, settings.contingencyPercent);
  return Response.json({ forecast, subject: buildTopupEmail(forecast).subject });
}
