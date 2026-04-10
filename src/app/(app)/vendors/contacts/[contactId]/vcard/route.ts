import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    contactId: string;
  }>;
};

function splitName(name: string) {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) {
    return { first: tokens[0] ?? "", last: "" };
  }
  return {
    first: tokens.slice(0, -1).join(" "),
    last: tokens[tokens.length - 1] ?? "",
  };
}

function escapeVcardValue(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function safeFilename(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "contact.vcf";
  const normalized = trimmed.replace(/[^a-zA-Z0-9 _.-]/g, "").replace(/\s+/g, "_");
  return `${normalized || "contact"}.vcf`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { contactId } = await context.params;
  const contact = await prisma.vendorContact.findUnique({
    where: { id: contactId },
    include: { company: true },
  });

  if (!contact) {
    return new Response("Contact not found", { status: 404 });
  }

  const { first, last } = splitName(contact.name);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVcardValue(contact.name)}`,
    `N:${escapeVcardValue(last)};${escapeVcardValue(first)};;;`,
    `ORG:${escapeVcardValue(contact.company.name)}`,
    contact.position ? `TITLE:${escapeVcardValue(contact.position)}` : "",
    contact.email ? `EMAIL;TYPE=INTERNET:${escapeVcardValue(contact.email)}` : "",
    contact.phone ? `TEL;TYPE=WORK,VOICE:${escapeVcardValue(contact.phone)}` : "",
    contact.location ? `ADR;TYPE=WORK:;;${escapeVcardValue(contact.location)};;;;` : "",
    "NOTE:Exported from WatchTower Vendor Contacts",
    "END:VCARD",
    "",
  ].filter(Boolean);

  const body = lines.join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFilename(contact.name)}"`,
      "Cache-Control": "no-store",
    },
  });
}
