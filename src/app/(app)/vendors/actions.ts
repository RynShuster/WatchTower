"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function cleanText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function createVendorCompany(formData: FormData) {
  const name = cleanText(formData.get("name"));
  if (!name) {
    return;
  }

  const profile = cleanText(formData.get("profile"));
  const website = cleanText(formData.get("website"));
  const categoryIds = formData
    .getAll("categoryIds")
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);

  const company = await prisma.vendorCompany.upsert({
    where: { name },
    update: {
      profile: profile || null,
      website: website || null,
    },
    create: {
      name,
      profile: profile || null,
      website: website || null,
    },
    select: { id: true },
  });

  if (categoryIds.length > 0) {
    for (const categoryId of new Set(categoryIds)) {
      await prisma.vendorCompanyCategory.upsert({
        where: {
          companyId_categoryId: {
            companyId: company.id,
            categoryId,
          },
        },
        create: {
          companyId: company.id,
          categoryId,
        },
        update: {},
      });
    }
  }

  revalidatePath("/vendors");
}

export async function createVendorContact(formData: FormData) {
  const companyId = cleanText(formData.get("companyId"));
  const name = cleanText(formData.get("name"));
  if (!companyId || !name) {
    return;
  }

  const position = cleanText(formData.get("position"));
  const location = cleanText(formData.get("location"));
  const email = cleanText(formData.get("email"));
  const phone = cleanText(formData.get("phone"));

  await prisma.vendorContact.create({
    data: {
      companyId,
      name,
      position: position || null,
      location: location || null,
      email: email || null,
      phone: phone || null,
    },
  });

  revalidatePath("/vendors");
}

export async function updateVendorCompany(formData: FormData) {
  const companyId = cleanText(formData.get("companyId"));
  const name = cleanText(formData.get("name"));
  if (!companyId || !name) {
    return;
  }

  const profile = cleanText(formData.get("profile"));
  const website = cleanText(formData.get("website"));
  const categoryIds = formData
    .getAll("categoryIds")
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);

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
}

export async function updateVendorContact(formData: FormData) {
  const contactId = cleanText(formData.get("contactId"));
  const name = cleanText(formData.get("name"));
  if (!contactId || !name) {
    return;
  }

  const position = cleanText(formData.get("position"));
  const location = cleanText(formData.get("location"));
  const email = cleanText(formData.get("email"));
  const phone = cleanText(formData.get("phone"));

  await prisma.vendorContact.update({
    where: { id: contactId },
    data: {
      name,
      position: position || null,
      location: location || null,
      email: email || null,
      phone: phone || null,
    },
  });

  revalidatePath("/vendors");
}
