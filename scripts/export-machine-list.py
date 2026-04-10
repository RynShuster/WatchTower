"""
Optional import: regenerate prisma/machineList.import.json from machineList.xlsx.
Run from project root: python scripts/export-machine-list.py
JSON is the canonical source of truth; workbook import is for recovery/manual sync only.
"""
from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "machineList.xlsx"
OUT = ROOT / "prisma" / "machineList.import.json"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

def normalize_asset_id(row: dict[str, str], asset: str) -> str:
    make = str(row.get("B", "")).strip()
    location = str(row.get("E", "")).strip().upper()
    serial = str(row.get("G", "")).strip()

    if make.casefold() == "hermle" and location == "F3" and serial:
        return f"{make.upper()}-{serial}"

    return asset


def uniquify_asset_id(row: dict[str, str], asset: str, seen: set[str]) -> str:
    if asset not in seen:
        seen.add(asset)
        return asset

    make = str(row.get("B", "")).strip().upper()
    serial = str(row.get("G", "")).strip()
    if make and serial:
        fallback = f"{make}-{serial}"
        if fallback not in seen:
            seen.add(fallback)
            return fallback

    suffix = 2
    candidate = f"{asset}-{suffix}"
    while candidate in seen:
        suffix += 1
        candidate = f"{asset}-{suffix}"
    seen.add(candidate)
    return candidate


def main() -> None:
    if not XLSX.is_file():
        raise SystemExit(f"Missing {XLSX}")

    with zipfile.ZipFile(XLSX) as z:
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        strings: list[str] = []
        for si in root.findall(".//m:si", NS):
            parts: list[str] = []
            for t in si.findall(".//m:t", NS):
                parts.append(t.text or "")
            strings.append("".join(parts))

        sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        rows_out: list[tuple[int, dict[str, str]]] = []
        for row in sheet.findall(".//m:row", NS):
            r: dict[str, str] = {}
            for c in row.findall("m:c", NS):
                ref = c.get("r") or ""
                m = re.match(r"([A-Z]+)", ref)
                if not m:
                    continue
                col = m.group(1)
                t = c.get("t")
                v = c.find("m:v", NS)
                if v is None or v.text is None:
                    continue
                val = v.text
                if t == "s":
                    val = strings[int(val)]
                r[col] = val.strip() if isinstance(val, str) else str(val)
            if r:
                rows_out.append((int(row.get("r", "0")), r))
        rows_out.sort(key=lambda x: x[0])

    data: list[dict[str, str]] = []
    seen_asset_ids: set[str] = set()
    for rn, r in rows_out[1:]:
        if "H" not in r:
            continue
        asset = str(r.get("H", "")).strip()
        if not asset:
            continue
        asset = normalize_asset_id(r, asset)
        asset = uniquify_asset_id(r, asset, seen_asset_ids)
        data.append(
            {
                "makeID": str(r.get("B", "")).strip(),
                "modelID": str(r.get("C", "")).strip(),
                "typeID": str(r.get("D", "")).strip(),
                "locationID": str(r.get("E", "")).strip(),
                "citystateID": str(r.get("F", "")).strip(),
                "serialID": str(r.get("G", "")).strip(),
                "assetID": asset,
                "lineID": str(r.get("I", "")).strip(),
            }
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"Wrote {len(data)} rows to {OUT}")


if __name__ == "__main__":
    main()
