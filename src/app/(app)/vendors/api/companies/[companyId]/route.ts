import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    companyId: string;
  }>;
};

type CompanyUpdatePayload = {
  name?: string;
  profile?: string;
  website?: string;
  categoryIds?: string[];
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, context: RouteContext) {
  const { companyId } = await context.params;
  const payload = (await request.json()) as CompanyUpdatePayload;

  const name = clean(payload.name);
  if (!name) {
    return Response.json({ error: "Company name is required." }, { status: 400 });
  }

  const profile = clean(payload.profile);
  const website = clean(payload.website);
  const categoryIds = Array.isArray(payload.categoryIds)
    ? payload.categoryIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  await prisma.vendorCompany.update({
    where: { id: companyId },
    data: {
      name,
      profile: profile || null,
      website: website || null,
    },
  });

  await prisma.vendorCompanyCategory.deleteMany({
    where: { companyId },
  });

  for (const categoryId of new Set(categoryIds)) {
    await prisma.vendorCompanyCategory.create({
      data: {
        companyId,
        categoryId,
      },
    });
  }

  revalidatePath("/vendors");
  return Response.json({ ok: true });
}
