"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type MachineCatalogRow = {
  id: string;
  makeID: string;
  modelID: string;
  typeID: string;
  locationID: string;
  citystateID: string;
  serialID: string;
  assetID: string;
  lineID: string;
};

type MachineCatalogClientProps = {
  rows: MachineCatalogRow[];
  initialFilters?: {
    q?: string;
    make?: string;
    model?: string;
    location?: string;
  };
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

export function MachineCatalogClient({ rows, initialFilters }: MachineCatalogClientProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialFilters?.q ?? "");
  const [selectedMake, setSelectedMake] = useState(initialFilters?.make ?? "");
  const [selectedModel, setSelectedModel] = useState(initialFilters?.model ?? "");
  const [selectedLocation, setSelectedLocation] = useState(initialFilters?.location ?? "");

  const makeOptions = useMemo(
    () => [...new Set(rows.map((row) => row.makeID).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const modelOptions = useMemo(() => {
    const source = selectedMake ? rows.filter((row) => row.makeID === selectedMake) : rows;
    return [...new Set(source.map((row) => row.modelID).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [rows, selectedMake]);

  const locationOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const row of rows) {
      if (!row.locationID) continue;
      unique.set(row.locationID, row.citystateID ? `${row.locationID} (${row.citystateID})` : row.locationID);
    }
    return [...unique.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

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
    const nextUrl = persistedQueryString ? `/machines?${persistedQueryString}` : "/machines";
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [persistedQueryString]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (selectedMake && r.makeID !== selectedMake) return false;
      if (selectedModel && r.modelID !== selectedModel) return false;
      if (selectedLocation && r.locationID !== selectedLocation) return false;
      if (!s) return true;

      return [r.makeID, r.modelID, r.typeID, r.locationID, r.citystateID, r.serialID, r.assetID, r.lineID]
        .join(" ")
        .toLowerCase()
        .includes(s);
    });
  }, [rows, q, selectedLocation, selectedMake, selectedModel]);

  const exportHref = persistedQueryString ? `/machines/export?${persistedQueryString}` : "/machines/export";

  return (
    <>
      <div className="catalogToolbar">
        <div className="catalogSearchWrap">
          <SearchIcon />
          <input
            type="search"
            className="catalogSearch"
            placeholder="Filter table…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filter machines"
          />
        </div>
        <div className="catalogFilterGroup">
          <label className="catalogFilterField">
            <span>Make</span>
            <select value={selectedMake} onChange={(e) => setSelectedMake(e.target.value)} aria-label="Filter by make">
              <option value="">All Makes</option>
              {makeOptions.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>
          </label>

          <label className="catalogFilterField">
            <span>Model</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
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

          <label className="catalogFilterField">
            <span>Location</span>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              aria-label="Filter by location"
            >
              <option value="">All Locations</option>
              {locationOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <a className="catalogDownloadBtn" href={exportHref}>
          Download CSV
        </a>
        <span className="catalogCount">
          {filtered.length} of {rows.length} machines
        </span>
      </div>

      <div className="catalogTableWrap">
        {filtered.length === 0 ? (
          <p className="catalogEmpty">No rows match your filter.</p>
        ) : (
          <table className="catalogTable">
            <thead>
              <tr>
                <th>#</th>
                <th>makeID</th>
                <th>modelID</th>
                <th>typeID</th>
                <th>locationID</th>
                <th>citystateID</th>
                <th>serialID</th>
                <th>assetID</th>
                <th>lineID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className="catalogRowLink"
                  tabIndex={0}
                  role="link"
                  aria-label={`Open summary for ${r.makeID} ${r.modelID} ${r.assetID}`}
                  onClick={() => router.push(`/machines/${r.id}${persistedQueryString ? `?${persistedQueryString}` : ""}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/machines/${r.id}${persistedQueryString ? `?${persistedQueryString}` : ""}`);
                    }
                  }}
                >
                  <td>{i + 1}</td>
                  <td>{r.makeID}</td>
                  <td>{r.modelID}</td>
                  <td>{r.typeID}</td>
                  <td>{r.locationID}</td>
                  <td>{r.citystateID}</td>
                  <td>{r.serialID}</td>
                  <td>{r.assetID}</td>
                  <td>{r.lineID}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
