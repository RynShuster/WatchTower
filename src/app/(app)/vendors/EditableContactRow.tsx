"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EditableContactRowProps = {
  contact: {
    id: string;
    name: string;
    position: string | null;
    location: string | null;
    email: string | null;
    phone: string | null;
  };
};

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function EditableContactRow({ contact }: EditableContactRowProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState(contact.name);
  const [position, setPosition] = useState(contact.position ?? "");
  const [location, setLocation] = useState(contact.location ?? "");
  const [email, setEmail] = useState(contact.email ?? "");
  const [phone, setPhone] = useState(contact.phone ?? "");

  function resetToOriginal() {
    setName(contact.name);
    setPosition(contact.position ?? "");
    setLocation(contact.location ?? "");
    setEmail(contact.email ?? "");
    setPhone(contact.phone ?? "");
  }

  async function saveChanges() {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/vendors/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          position: position.trim(),
          location: location.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });
      if (!response.ok) throw new Error("Failed to save contact");
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
    <tr>
      <td>
        <div className="vendorContactNameCell">
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
            <button type="button" className="vendorIconButton" aria-label={`Edit ${contact.name}`} onClick={() => setIsEditing(true)}>
              <PencilIcon />
            </button>
          )}
          {isEditing ? (
            <input className="vendorCellInput" value={name} onChange={(event) => setName(event.target.value)} />
          ) : (
            <span>{contact.name}</span>
          )}
        </div>
      </td>
      <td>
        {isEditing ? (
          <input className="vendorCellInput" value={position} onChange={(event) => setPosition(event.target.value)} />
        ) : (
          (contact.position ?? "-")
        )}
      </td>
      <td>
        {isEditing ? (
          <input className="vendorCellInput" value={location} onChange={(event) => setLocation(event.target.value)} />
        ) : (
          (contact.location ?? "-")
        )}
      </td>
      <td>
        {isEditing ? (
          <input className="vendorCellInput" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        ) : (
          (contact.email ?? "-")
        )}
      </td>
      <td>
        {isEditing ? (
          <input className="vendorCellInput" value={phone} onChange={(event) => setPhone(event.target.value)} />
        ) : (
          (contact.phone ?? "-")
        )}
      </td>
      <td>
        <a className="vendorExportLink" href={`/vendors/contacts/${contact.id}/vcard`}>
          vCard
        </a>
      </td>
    </tr>
  );
}
