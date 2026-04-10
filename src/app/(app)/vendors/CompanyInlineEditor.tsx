"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CategoryOption = {
  id: string;
  name: string;
};

type CompanyEditorProps = {
  company: {
    id: string;
    name: string;
    profile: string | null;
    website: string | null;
    categoryIds: string[];
  };
  categories: CategoryOption[];
};

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function CompanyInlineEditor({ company, categories }: CompanyEditorProps) {
  const router = useRouter();
  const initialCategoryIds = useMemo(() => new Set(company.categoryIds), [company.categoryIds]);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState(company.name);
  const [profile, setProfile] = useState(company.profile ?? "");
  const [website, setWebsite] = useState(company.website ?? "");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set(initialCategoryIds));

  function resetToOriginal() {
    setName(company.name);
    setProfile(company.profile ?? "");
    setWebsite(company.website ?? "");
    setSelectedCategoryIds(new Set(initialCategoryIds));
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  async function saveChanges() {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/vendors/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          profile: profile.trim(),
          website: website.trim(),
          categoryIds: Array.from(selectedCategoryIds),
        }),
      });
      if (!response.ok) throw new Error("Failed to save company");
      setIsEditing(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  function cancelChanges() {
    resetToOriginal();
    setIsEditing(false);
  }

  return (
    <div>
      <div className="vendorNameRow">
        <h3>{name}</h3>
        {isEditing ? (
          <div className="vendorEditActions">
            <button type="button" className="vendorEditActionDone" onClick={saveChanges} disabled={isSaving}>
              Done
            </button>
            <button type="button" className="vendorEditActionCancel" onClick={cancelChanges} disabled={isSaving}>
              X
            </button>
          </div>
        ) : (
          <button type="button" className="vendorIconButton" aria-label={`Edit ${company.name}`} onClick={() => setIsEditing(true)}>
            <PencilIcon />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="vendorInlineForm">
          <label>
            Company Name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Company Profile
            <textarea rows={3} value={profile} onChange={(event) => setProfile(event.target.value)} />
          </label>
          <label>
            Website
            <input value={website} onChange={(event) => setWebsite(event.target.value)} />
          </label>
          <fieldset>
            <legend>CNC Product Categories</legend>
            <div className="vendorCategoryGrid">
              {categories.map((item) => (
                <label key={item.id} className="vendorCheckbox">
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.has(item.id)}
                    onChange={() => toggleCategory(item.id)}
                  />{" "}
                  {item.name}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
