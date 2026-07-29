import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { randomUUID } from "crypto";
import type { EmailRecipientCategory } from "@prisma/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_CATEGORIES: EmailRecipientCategory[] = ["TURTLES", "SEALS", "DOLPHINS", "SHARKS", "FREE_SURFERS", "ZERO_ATTENDANCE"];

export async function GET() {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const recipients = await prisma.emailRecipient.findMany({ orderBy: { createdAt: "asc" } });
  return Response.json(recipients);
}

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const email = body.email?.trim();
  const category = body.category as EmailRecipientCategory;

  if (!email || !EMAIL_RE.test(email)) {
    return Response.json({ error: "A valid email address is required" }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  try {
    const recipient = await prisma.emailRecipient.create({
      data: { id: randomUUID(), category, email, createdBy: user.name ?? user.id },
    });
    return Response.json({ success: true, recipient });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Unique constraint")) {
      return Response.json({ error: "This email address is already a recipient for this category" }, { status: 409 });
    }
    return Response.json({ error: "Failed to add recipient" }, { status: 500 });
  }
}
