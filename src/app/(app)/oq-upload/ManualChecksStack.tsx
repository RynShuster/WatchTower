"use client";

import { useState } from "react";

type ManualCheckField = {
  key:
    | "spindleRunout0mm"
    | "spindleRunout250mm"
    | "spindleParallelismX"
    | "spindleParallelismY"
    | "spindleVelocity"
    | "spindleAcceleration"
    | "drawBarForce"
    | "squarenessXY"
    | "squarenessXZ"
    | "squarenessYZ";
  label: string;
  unit: string;
};

const manualCheckFields: ManualCheckField[] = [
  { key: "spindleRunout0mm", label: "Spindle Runout at 0 mm", unit: "mm" },
  { key: "spindleRunout250mm", label: "Spindle Runout at 250 mm", unit: "mm" },
  { key: "spindleParallelismX", label: "Spindle Parallelism to X", unit: "mm" },
  { key: "spindleParallelismY", label: "Spindle Parallelism to Y", unit: "mm" },
  { key: "squarenessXY", label: "Squareness XY", unit: "mm" },
  { key: "squarenessXZ", label: "Squareness XZ", unit: "mm" },
  { key: "squarenessYZ", label: "Squareness YZ", unit: "mm" },
  { key: "spindleVelocity", label: "Spindle Velocity", unit: "mm/s RMS" },
  { key: "spindleAcceleration", label: "Spindle Acceleration", unit: "m/s2 RMS" },
  { key: "drawBarForce", label: "Draw Bar Force", unit: "kN" },
];

export function ManualChecksStack() {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(manualCheckFields.map((field) => [field.key, ""])),
  );

  return (
    <div className="oqManualStack">
      {manualCheckFields.map((field, index) => {
        const previousKey = manualCheckFields[index - 1]?.key;
        const isUnlocked = index === 0 || Boolean(previousKey && values[previousKey].trim());

        return (
          <label key={field.key}>
            {field.label}
            <div className="oqInputWithUnit">
              <input
                name={field.key}
                type="number"
                step="any"
                inputMode="decimal"
                required
                value={values[field.key]}
                disabled={!isUnlocked}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setValues((prev) => {
                    const updated = { ...prev, [field.key]: nextValue };
                    if (nextValue.trim()) {
                      return updated;
                    }

                    // If a field is cleared, clear all downstream fields to preserve sequence.
                    for (let i = index + 1; i < manualCheckFields.length; i += 1) {
                      updated[manualCheckFields[i].key] = "";
                    }
                    return updated;
                  });
                }}
              />
              <span>{field.unit}</span>
            </div>
          </label>
        );
      })}
    </div>
  );
}
