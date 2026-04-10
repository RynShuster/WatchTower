"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MachineDownselect, type MachineDownselectOption } from "../oq-upload/MachineDownselect";
import type { HealthSubmissionManualChecksEdit } from "./healthDatabaseData";

export type HealthDatabaseRow = {
  id: string;
  machineId: string;
  factory: string;
  model: string;
  make: string;
  serialNumber: string;
  lineId: string;
  uploadDate: string;
  spindleRunout0mm: string;
  spindleRunout250mm: string;
  spindleParallelismX: string;
  spindleParallelismY: string;
  spindleVelocity: string;
  spindleAcceleration: string;
  drawbarForce: string;
  straightnessX: string;
  straightnessY: string;
  straightnessZ: string;
  sqaurenessXY: string;
  squarenessXZ: string;
  squarenessYZ: string;
  circularityXY: string;
  circularityXZ: string;
  circularityYZ: string;
  isTestingSubmission: boolean;
  technicianName: string;
  summaryNotes: string;
  editManual?: HealthSubmissionManualChecksEdit;
};

type HealthDatabaseEditDraft = {
  machineId: string;
  technicianName: string;
  summaryNotes: string;
  submittedAtLocal: string;
  spindleRunout0mm: string;
  spindleRunout250mm: string;
  spindleParallelismX: string;
  spindleParallelismY: string;
  spindleVelocity: string;
  spindleAcceleration: string;
  drawBarForce: string;
  squarenessXY: string;
  squarenessXZ: string;
  squarenessYZ: string;
  straightnessX: string;
  straightnessY: string;
  straightnessZ: string;
  circularityXY: string;
  circularityXZ: string;
  circularityYZ: string;
};

type HealthDatabaseClientProps = {
  rows: HealthDatabaseRow[];
  machineOptions: MachineDownselectOption[];
  initialFilters?: {
    q?: string;
    make?: string;
    model?: string;
    location?: string;
  };
};

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function numberToInput(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "";
  return String(n);
}

function buildEditDraft(row: HealthDatabaseRow, manual: HealthSubmissionManualChecksEdit): HealthDatabaseEditDraft {
  return {
    machineId: row.machineId,
    technicianName: row.technicianName,
    summaryNotes: row.summaryNotes,
    submittedAtLocal: toDatetimeLocalValue(row.uploadDate),
    spindleRunout0mm: numberToInput(manual.spindleRunout0mm),
    spindleRunout250mm: numberToInput(manual.spindleRunout250mm),
    spindleParallelismX: numberToInput(manual.spindleParallelismX),
    spindleParallelismY: numberToInput(manual.spindleParallelismY),
    spindleVelocity: numberToInput(manual.spindleVelocity),
    spindleAcceleration: numberToInput(manual.spindleAcceleration),
    drawBarForce: numberToInput(manual.drawBarForce),
    squarenessXY: numberToInput(manual.squarenessXY),
    squarenessXZ: numberToInput(manual.squarenessXZ),
    squarenessYZ: numberToInput(manual.squarenessYZ),
    straightnessX: numberToInput(manual.straightnessX),
    straightnessY: numberToInput(manual.straightnessY),
    straightnessZ: numberToInput(manual.straightnessZ),
    circularityXY: numberToInput(manual.circularityXY),
    circularityXZ: numberToInput(manual.circularityXZ),
    circularityYZ: numberToInput(manual.circularityYZ),
  };
}

function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

export function HealthDatabaseClient({ rows, machineOptions, initialFilters }: HealthDatabaseClientProps) {
  const router = useRouter();
  const [localRows, setLocalRows] = useState(rows);
  const [q, setQ] = useState(initialFilters?.q ?? "");
  const [selectedMake, setSelectedMake] = useState(initialFilters?.make ?? "");
  const [selectedModel, setSelectedModel] = useState(initialFilters?.model ?? "");
  const [selectedLocation, setSelectedLocation] = useState(initialFilters?.location ?? "");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [editingRow, setEditingRow] = useState<HealthDatabaseRow | null>(null);
  const [editDraft, setEditDraft] = useState<HealthDatabaseEditDraft | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const skipNextEmptyMachineId = useRef(false);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const makeOptions = useMemo(
    () =>
      [...new Set(localRows.map((row) => row.make).filter(Boolean).filter((value) => value !== "-"))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [localRows],
  );

  const modelOptions = useMemo(() => {
    const source = selectedMake ? localRows.filter((row) => row.make === selectedMake) : localRows;
    return [...new Set(source.map((row) => row.model).filter(Boolean).filter((value) => value !== "-"))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [localRows, selectedMake]);

  const locationOptions = useMemo(
    () =>
      [...new Set(localRows.map((row) => row.factory).filter(Boolean).filter((value) => value !== "-"))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [localRows],
  );

  useEffect(() => {
    if (selectedModel && !modelOptions.includes(selectedModel)) {
      setSelectedModel("");
    }
  }, [modelOptions, selectedModel]);

  const persistedQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (selectedMake) params.set("make", selectedMake);
    if (selectedModel) params.set("model", selectedModel);
    if (selectedLocation) params.set("location", selectedLocation);
    return params.toString();
  }, [q, selectedLocation, selectedMake, selectedModel]);

  useEffect(() => {
    const nextUrl = persistedQueryString ? `/health-database?${persistedQueryString}` : "/health-database";
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [persistedQueryString]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return localRows.filter((row) => {
      if (selectedMake && row.make !== selectedMake) return false;
      if (selectedModel && row.model !== selectedModel) return false;
      if (selectedLocation && row.factory !== selectedLocation) return false;
      if (!search) return true;

      return [
        row.factory,
        row.model,
        row.make,
        row.serialNumber,
        row.lineId,
        row.uploadDate,
        row.spindleRunout0mm,
        row.spindleRunout250mm,
        row.spindleParallelismX,
        row.spindleParallelismY,
        row.spindleVelocity,
        row.spindleAcceleration,
        row.drawbarForce,
        row.straightnessX,
        row.straightnessY,
        row.straightnessZ,
        row.sqaurenessXY,
        row.squarenessXZ,
        row.squarenessYZ,
        row.circularityXY,
        row.circularityXZ,
        row.circularityYZ,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [localRows, q, selectedLocation, selectedMake, selectedModel]);

  useEffect(() => {
    if (!editingRow?.editManual) {
      setEditDraft(null);
      return;
    }
    setEditDraft(buildEditDraft(editingRow, editingRow.editManual));
  }, [editingRow]);

  function openEdit(row: HealthDatabaseRow) {
    if (!row.isTestingSubmission || !row.editManual) return;
    setEditError("");
    skipNextEmptyMachineId.current = true;
    setEditingRow(row);
  }

  function closeEdit() {
    setEditingRow(null);
    setEditDraft(null);
    setEditError("");
  }

  async function handleSaveEdit() {
    if (!editingRow || !editDraft) return;

    setEditError("");
    setEditSaving(true);
    try {
      const d = editDraft;
      const manualChecks = {
        spindleRunout0mm: Number(d.spindleRunout0mm),
        spindleRunout250mm: Number(d.spindleRunout250mm),
        spindleParallelismX: Number(d.spindleParallelismX),
        spindleParallelismY: Number(d.spindleParallelismY),
        spindleVelocity: Number(d.spindleVelocity),
        spindleAcceleration: Number(d.spindleAcceleration),
        drawBarForce: Number(d.drawBarForce),
        squarenessXY: Number(d.squarenessXY),
        squarenessXZ: Number(d.squarenessXZ),
        squarenessYZ: Number(d.squarenessYZ),
        straightnessX: parseOptionalNumber(d.straightnessX),
        straightnessY: parseOptionalNumber(d.straightnessY),
        straightnessZ: parseOptionalNumber(d.straightnessZ),
        circularityXY: parseOptionalNumber(d.circularityXY),
        circularityXZ: parseOptionalNumber(d.circularityXZ),
        circularityYZ: parseOptionalNumber(d.circularityYZ),
      };

      const response = await fetch(`/health-database/${editingRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: d.machineId,
          technicianName: d.technicianName,
          summaryNotes: d.summaryNotes.trim() || null,
          submittedAt: new Date(d.submittedAtLocal).toISOString(),
          manualChecks,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save changes.");
      }

      closeEdit();
      router.refresh();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Failed to save changes.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteSubmission(row: HealthDatabaseRow) {
    const confirmed = window.confirm(
      `Delete OQ upload from ${new Date(row.uploadDate).toLocaleString()} for serial ${row.serialNumber}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleteError("");
    setDeletingId(row.id);
    try {
      const response = await fetch(`/health-database/${row.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to delete OQ upload.");
      }
      setLocalRows((prev) => prev.filter((item) => item.id !== row.id));
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to delete OQ upload.");
    } finally {
      setDeletingId(null);
    }
  }

  const exportHref = persistedQueryString ? `/health-database/export?${persistedQueryString}` : "/health-database/export";

  return (
    <>
      <div className="healthDbToolbar">
        <div className="healthDbSearchWrap">
          <SearchIcon />
          <input
            type="search"
            className="healthDbSearch"
            placeholder="Filter table..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
            aria-label="Filter health database rows"
          />
        </div>
        <div className="healthDbFilterGroup">
          <label className="healthDbFilterField">
            <span>Make</span>
            <select value={selectedMake} onChange={(event) => setSelectedMake(event.target.value)} aria-label="Filter by make">
              <option value="">All Makes</option>
              {makeOptions.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>
          </label>
          <label className="healthDbFilterField">
            <span>Model</span>
            <select
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              aria-label="Filter by model"
            >
              <option value="">All Models</option>
              {modelOptions.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>
          <label className="healthDbFilterField">
            <span>Location</span>
            <select
              value={selectedLocation}
              onChange={(event) => setSelectedLocation(event.target.value)}
              aria-label="Filter by location"
            >
              <option value="">All Locations</option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>
        </div>
        <a className="healthDbDownloadBtn" href={exportHref}>
          Download CSV
        </a>
        <span className="healthDbCount">
          {filtered.length} of {localRows.length} submissions
        </span>
      </div>
      {deleteError ? <p className="healthDbDeleteError">{deleteError}</p> : null}

      {editingRow && editDraft ? (
        <div className="healthDbModalOverlay" role="presentation" onClick={closeEdit}>
          <div
            className="healthDbModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="healthDbEditTitle"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="healthDbModalHeader">
              <h2 id="healthDbEditTitle">Edit testing OQ upload</h2>
              <button type="button" className="healthDbModalClose" onClick={closeEdit} aria-label="Close">
                ×
              </button>
            </div>
            <p className="healthDbModalNote">
              Only submissions saved as <strong>Testing (Apps Team Only)</strong> can be edited. Ballbar file data in
              storage is unchanged; adjust displayed metrics below if needed.
            </p>
            {editError ? <p className="healthDbDeleteError">{editError}</p> : null}

            <div className="healthDbEditSections">
              <section className="healthDbEditSection">
                <h3>Machine</h3>
                <MachineDownselect
                  key={editingRow.id}
                  machines={machineOptions}
                  initialMachineId={editingRow.machineId}
                  omitHiddenInput
                  onMachineIdChange={(id) =>
                    setEditDraft((prev) => {
                      if (!prev) return prev;
                      if (!id && skipNextEmptyMachineId.current) {
                        skipNextEmptyMachineId.current = false;
                        return prev;
                      }
                      skipNextEmptyMachineId.current = false;
                      return { ...prev, machineId: id };
                    })
                  }
                />
              </section>

              <section className="healthDbEditSection">
                <h3>Technician &amp; time</h3>
                <label className="healthDbEditLabel">
                  Technician name
                  <input
                    type="text"
                    maxLength={120}
                    value={editDraft.technicianName}
                    onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, technicianName: e.target.value } : prev))}
                  />
                </label>
                <label className="healthDbEditLabel">
                  Upload date
                  <input
                    type="datetime-local"
                    value={editDraft.submittedAtLocal}
                    onChange={(e) =>
                      setEditDraft((prev) => (prev ? { ...prev, submittedAtLocal: e.target.value } : prev))
                    }
                  />
                </label>
              </section>

              <section className="healthDbEditSection">
                <h3>Manual OQ checks</h3>
                <div className="healthDbEditGrid">
                  {(
                    [
                      ["spindleRunout0mm", "Spindle runout at 0 mm", "mm"],
                      ["spindleRunout250mm", "Spindle runout at 250 mm", "mm"],
                      ["spindleParallelismX", "Spindle parallelism to X", "mm"],
                      ["spindleParallelismY", "Spindle parallelism to Y", "mm"],
                      ["squarenessXY", "Squareness XY", "mm"],
                      ["squarenessXZ", "Squareness XZ", "mm"],
                      ["squarenessYZ", "Squareness YZ", "mm"],
                      ["spindleVelocity", "Spindle velocity", "mm/s RMS"],
                      ["spindleAcceleration", "Spindle acceleration", "m/s² RMS"],
                      ["drawBarForce", "Draw bar force", "kN"],
                    ] as const
                  ).map(([key, label, unit]) => (
                    <label key={key} className="healthDbEditLabel">
                      {label}
                      <span className="healthDbEditUnitWrap">
                        <input
                          type="number"
                          step="any"
                          inputMode="decimal"
                          value={editDraft[key]}
                          onChange={(e) =>
                            setEditDraft((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))
                          }
                        />
                        <span className="healthDbEditUnit">{unit}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="healthDbEditSection">
                <h3>Straightness &amp; circularity</h3>
                <p className="healthDbSubText">Leave blank to clear a value.</p>
                <div className="healthDbEditGrid">
                  {(
                    [
                      ["straightnessX", "Straightness X"],
                      ["straightnessY", "Straightness Y"],
                      ["straightnessZ", "Straightness Z"],
                      ["circularityXY", "Circularity XY"],
                      ["circularityXZ", "Circularity XZ"],
                      ["circularityYZ", "Circularity YZ"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="healthDbEditLabel">
                      {label} (mm)
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={editDraft[key]}
                        onChange={(e) =>
                          setEditDraft((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))
                        }
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="healthDbEditSection">
                <h3>Notes</h3>
                <label className="healthDbEditLabel">
                  OQ summary notes
                  <textarea
                    rows={4}
                    value={editDraft.summaryNotes}
                    onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, summaryNotes: e.target.value } : prev))}
                  />
                </label>
              </section>
            </div>

            <div className="healthDbModalActions">
              <button type="button" className="healthDbModalCancel" onClick={closeEdit} disabled={editSaving}>
                Cancel
              </button>
              <button
                type="button"
                className="healthDbModalSave"
                onClick={() => void handleSaveEdit()}
                disabled={editSaving || !editDraft.machineId.trim()}
              >
                {editSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="healthDbTableWrap">
        <table className="healthDbTable">
          <thead>
            <tr>
              <th>Factory</th>
              <th>Model</th>
              <th>Make</th>
              <th>Serial Number</th>
              <th>Line ID</th>
              <th>Upload Date</th>
              <th>Spindle Runout 0mm</th>
              <th>Spindle Runout 250mm</th>
              <th>Spindle Parallelism X</th>
              <th>Spindle Parallelism Y</th>
              <th>Spindle Velocity</th>
              <th>Spindle Acceleration</th>
              <th>Drawbar Force</th>
              <th>Straightness X</th>
              <th>Straightness Y</th>
              <th>Straightness Z</th>
              <th>Sqaureness XY</th>
              <th>Squareness XZ</th>
              <th>Squareness YZ</th>
              <th>Circularity XY</th>
              <th>Circularity XZ</th>
              <th>Circularity YZ</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={23} className="healthDbEmpty">
                  No rows match your filter.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.factory}</td>
                  <td>{row.model}</td>
                  <td>{row.make}</td>
                  <td>{row.serialNumber}</td>
                  <td>{row.lineId}</td>
                  <td>{new Date(row.uploadDate).toLocaleString()}</td>
                  <td>{row.spindleRunout0mm}</td>
                  <td>{row.spindleRunout250mm}</td>
                  <td>{row.spindleParallelismX}</td>
                  <td>{row.spindleParallelismY}</td>
                  <td>{row.spindleVelocity}</td>
                  <td>{row.spindleAcceleration}</td>
                  <td>{row.drawbarForce}</td>
                  <td>{row.straightnessX}</td>
                  <td>{row.straightnessY}</td>
                  <td>{row.straightnessZ}</td>
                  <td>{row.sqaurenessXY}</td>
                  <td>{row.squarenessXZ}</td>
                  <td>{row.squarenessYZ}</td>
                  <td>{row.circularityXY}</td>
                  <td>{row.circularityXZ}</td>
                  <td>{row.circularityYZ}</td>
                  <td>
                    <div className="healthDbActionCell">
                      {row.isTestingSubmission ? (
                        <button type="button" className="healthDbEditBtn" onClick={() => openEdit(row)}>
                          Edit
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="healthDbDeleteBtn"
                        onClick={() => handleDeleteSubmission(row)}
                        disabled={deletingId === row.id}
                      >
                        {deletingId === row.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
