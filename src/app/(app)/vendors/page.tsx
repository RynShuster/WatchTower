import { prisma } from "@/lib/prisma";
import { createVendorCompany, createVendorContact } from "./actions";
import { CompanyInlineEditor } from "./CompanyInlineEditor";
import { EditableContactRow } from "./EditableContactRow";
import "@/app/vendor-directory.css";

type VendorsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function VendorsPage({ searchParams }: VendorsPageProps) {
  const params = searchParams ? await searchParams : {};
  const q = firstValue(params.q).trim();
  const category = firstValue(params.category).trim();

  const categories = await prisma.vendorCategory.findMany({
    orderBy: { name: "asc" },
  });

  const vendors = await prisma.vendorCompany.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { profile: { contains: q } },
                { contacts: { some: { name: { contains: q } } } },
                { contacts: { some: { position: { contains: q } } } },
                { contacts: { some: { location: { contains: q } } } },
                { contacts: { some: { email: { contains: q } } } },
                { contacts: { some: { phone: { contains: q } } } },
              ],
            }
          : {},
        category
          ? {
              categoryLinks: {
                some: {
                  category: {
                    slug: category,
                  },
                },
              },
            }
          : {},
      ],
    },
    include: {
      contacts: {
        orderBy: [{ name: "asc" }, { id: "asc" }],
      },
      categoryLinks: {
        include: { category: true },
        orderBy: { category: { name: "asc" } },
      },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  return (
    <div className="vendorRoot">
      <header className="vendorHeader">
        <h1>Vendor Contacts</h1>
        <p>Searchable Hadrian vendor database with company profiles, CNC categories, and points of contact.</p>
      </header>

      <form method="get" className="vendorSearchRow">
        <label htmlFor="q">Search</label>
        <input id="q" name="q" defaultValue={q} placeholder="Company, profile, contact, email, phone..." />
        <label htmlFor="category">Category</label>
        <select id="category" name="category" defaultValue={category}>
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
        <button type="submit">Apply</button>
      </form>

      <section className="vendorPanel">
        <h2>Add Company</h2>
        <form action={createVendorCompany} className="vendorCompanyForm">
          <label>
            Company Name
            <input name="name" required placeholder="Acme Machine Supply" />
          </label>
          <label>
            Company Profile
            <textarea name="profile" rows={3} placeholder="What they provide, specialties, account notes..." />
          </label>
          <label>
            Website
            <input name="website" placeholder="https://example.com" />
          </label>
          <fieldset>
            <legend>CNC Product Categories</legend>
            <div className="vendorCategoryGrid">
              {categories.map((item) => (
                <label key={item.id} className="vendorCheckbox">
                  <input type="checkbox" name="categoryIds" value={item.id} /> {item.name}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit">Save Company</button>
        </form>
      </section>

      <section className="vendorPanel">
        <h2>Companies ({vendors.length})</h2>
        {vendors.length === 0 ? (
          <p className="vendorMuted">No companies found for this search.</p>
        ) : (
          <div className="vendorCards">
            {vendors.map((company) => (
              <article key={company.id} className="vendorCard">
                <header className="vendorCardHead">
                  <div>
                    <CompanyInlineEditor
                      company={{
                        id: company.id,
                        name: company.name,
                        profile: company.profile,
                        website: company.website,
                        categoryIds: company.categoryLinks.map((link) => link.categoryId),
                      }}
                      categories={categories.map((item) => ({ id: item.id, name: item.name }))}
                    />
                  </div>
                  <div className="vendorTagRow">
                    {company.categoryLinks.map((tag) => (
                      <span key={tag.categoryId}>{tag.category.name}</span>
                    ))}
                  </div>
                </header>

                {company.profile ? <p className="vendorProfile">{company.profile}</p> : null}

                <div className="vendorContacts">
                  <h4>Contacts ({company.contacts.length})</h4>
                  {company.contacts.length === 0 ? (
                    <p className="vendorMuted">No contacts added yet.</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Position</th>
                          <th>Location</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Export</th>
                        </tr>
                      </thead>
                      <tbody>
                        {company.contacts.map((contact) => (
                          <EditableContactRow
                            key={contact.id}
                            contact={{
                              id: contact.id,
                              name: contact.name,
                              position: contact.position,
                              location: contact.location,
                              email: contact.email,
                              phone: contact.phone,
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <details className="vendorAddContact">
                  <summary>Add Contact</summary>
                  <form action={createVendorContact} className="vendorContactForm">
                    <input type="hidden" name="companyId" value={company.id} />
                    <label>
                      Name
                      <input name="name" required placeholder="Jane Doe" />
                    </label>
                    <label>
                      Position
                      <input name="position" placeholder="Regional Sales Manager" />
                    </label>
                    <label>
                      Location
                      <input name="location" placeholder="Dallas, TX" />
                    </label>
                    <label>
                      Email
                      <input type="email" name="email" placeholder="jane@vendor.com" />
                    </label>
                    <label>
                      Phone
                      <input name="phone" placeholder="+1 555 123 4567" />
                    </label>
                    <button type="submit">Save Contact</button>
                  </form>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
