import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    contactId: string;
  }>;
};

type ContactUpdatePayload = {
  name?: string;
  position?: string;
  location?: string;
  email?: string;
  phone?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, context: RouteContext) {
  const { contactId } = await context.params;
  const payload = (await request.json()) as ContactUpdatePayload;

  const name = clean(payload.name);
  if (!name) {
    return Response.json({ error: "Contact name is required." }, { status: 400 });
  }

  await prisma.vendorContact.update({
    where: { id: contactId },
    data: {
      name,
      position: clean(payload.position) || null,
      location: clean(payload.location) || null,
      email: clean(payload.email) || null,
      phone: clean(payload.phone) || null,
    },
  });

  revalidatePath("/vendors");
  return Response.json({ ok: true });
}
