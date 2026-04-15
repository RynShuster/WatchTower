"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type ManualCheckFieldKey =
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

type ManualCheckField = {
  key: ManualCheckFieldKey;
  label: string;
  unit: string;
};

/** Order and units aligned with `toleranceDefinitions.json`. */
const manualCheckFields: ManualCheckField[] = [
  { key: "spindleRunout0mm", label: "Spindle runout at 0 mm", unit: "mm" },
  { key: "spindleRunout250mm", label: "Spindle runout at 250 mm", unit: "mm" },
  { key: "spindleParallelismY", label: "Spindle parallelism to Y", unit: "mm" },
  { key: "spindleParallelismX", label: "Spindle parallelism to X", unit: "mm" },
  { key: "squarenessXY", label: "Squareness XY", unit: "mm" },
  { key: "squarenessXZ", label: "Squareness XZ", unit: "mm" },
  { key: "squarenessYZ", label: "Squareness YZ", unit: "mm" },
  { key: "spindleVelocity", label: "Spindle velocity", unit: "mm/s" },
  { key: "spindleAcceleration", label: "Spindle acceleration", unit: "m/s^2" },
  { key: "drawBarForce", label: "Drawbar force", unit: "kN" },
];

const emptyValues = (): Record<ManualCheckFieldKey, string> =>
  Object.fromEntries(manualCheckFields.map((f) => [f.key, ""])) as Record<ManualCheckFieldKey, string>;

const ballbarFileSteps = [
  { name: "xyFile" as const, label: "XY" as const },
  { name: "xzFile" as const, label: "XZ" as const },
  { name: "yzFile" as const, label: "YZ" as const },
];

export function ManualChecksStack() {
  const fieldCount = manualCheckFields.length;
  const ballbarStepCount = ballbarFileSteps.length;
  const totalContentSteps = fieldCount + ballbarStepCount;

  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => emptyValues());
  const manualInputRef = useRef<HTMLInputElement>(null);
  const ballbarContinueRef = useRef<HTMLButtonElement>(null);

  const fieldIndex = step - 1;
  const currentField = fieldIndex >= 0 && fieldIndex < fieldCount ? manualCheckFields[fieldIndex] : null;

  const ballbarIndex = step - fieldCount - 1;
  const currentBallbar =
    ballbarIndex >= 0 && ballbarIndex < ballbarStepCount ? ballbarFileSteps[ballbarIndex] : null;

  const progressLabel =
    step === 0 ? null : step > totalContentSteps ? "Complete" : `Step ${step} of ${totalContentSteps}`;

  function handleStart() {
    setStep(1);
  }

  function handleConfirm() {
    if (!currentField) return;
    const raw = values[currentField.key].trim();
    if (!raw) {
      window.alert(`Please enter a value for ${currentField.label}.`);
      return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      window.alert(`Enter a valid number for ${currentField.label}.`);
      return;
    }
    const unitPhrase = currentField.unit ? ` ${currentField.unit}` : "";
    const ok = window.confirm(
      `You entered ${raw}${unitPhrase} for ${currentField.label}. Is this correct?`,
    );
    if (!ok) return;
    setStep((s) => Math.min(s + 1, totalContentSteps + 1));
  }

  function handleManualFieldKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== "NumpadEnter") return;
    event.preventDefault();
    handleConfirm();
  }

  function handleBallbarConfirm() {
    if (!currentBallbar) return;
    setStep((s) => Math.min(s + 1, totalContentSteps + 1));
  }

  function handleBack() {
    if (step <= 0) return;
    if (step === 1) {
      setValues(emptyValues());
      setStep(0);
      return;
    }
    setStep((s) => s - 1);
  }

  function updateFieldValue(fieldKey: ManualCheckFieldKey, nextValue: string, fieldIdx: number) {
    setValues((prev) => {
      const updated = { ...prev, [fieldKey]: nextValue };
      if (!nextValue.trim()) {
        for (let i = fieldIdx + 1; i < fieldCount; i += 1) {
          updated[manualCheckFields[i].key] = "";
        }
      }
      return updated;
    });
  }

  useEffect(() => {
    if (step < 1 || step > fieldCount) return;
    const frame = requestAnimationFrame(() => {
      manualInputRef.current?.focus();
      manualInputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [step, fieldCount]);

  useEffect(() => {
    if (step <= fieldCount || step > totalContentSteps) return;
    const frame = requestAnimationFrame(() => {
      ballbarContinueRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [step, fieldCount, totalContentSteps]);

  const showIntroManualOrComplete =
    !currentBallbar && (step === 0 || currentField !== null || step > totalContentSteps);

  return (
    <div className="oqManualWizard">
      {manualCheckFields.map((field) => (
        <input key={field.key} type="hidden" name={field.key} value={values[field.key]} />
      ))}

      {progressLabel ? (
        <p className="oqManualWizardStepLabel" aria-live="polite">
          {progressLabel}
        </p>
      ) : null}

      <div
        className={`oqManualWizardViewport${step > totalContentSteps ? " oqManualWizardViewportComplete" : ""}`}
      >
        {ballbarFileSteps.map((entry, idx) => {
          const forStep = fieldCount + 1 + idx;
          const active = step === forStep;
          return (
            <div
              key={entry.name}
              className={active ? "oqBallbarWizardStep oqBallbarWizardStepActive" : "oqBallbarWizardStep"}
            >
              <label className="oqManualWizardFieldLabel">
                Ballbar file — {entry.label} plane
                <input name={entry.name} type="file" accept=".b5r,application/xml,text/xml" />
              </label>
              <p className="oqManualWizardIntro">
                Optional. Attach a Renishaw <code>.b5r</code> trace for this plane if you have one.
              </p>
              <div className="oqManualWizardActions">
                <button className="oqWizardSecondaryBtn" type="button" onClick={handleBack}>
                  Back
                </button>
                <button
                  ref={active ? ballbarContinueRef : undefined}
                  className="oqWizardPrimaryBtn"
                  type="button"
                  onClick={handleBallbarConfirm}
                >
                  Continue
                </button>
              </div>
            </div>
          );
        })}

        {showIntroManualOrComplete ? (
          <div key={step} className="oqManualWizardPanel">
            {step === 0 ? (
              <>
                <h3 className="oqManualWizardTitle">OQ Checks</h3>
                <p className="oqManualWizardIntro">
                  Walk through each manual measurement (units match the OQ tolerance tables), then attach ballbar
                  traces plane by plane. Confirm each measurement before moving on.
                </p>
                <button className="oqWizardPrimaryBtn" type="button" onClick={handleStart}>
                  Start upload
                </button>
              </>
            ) : null}

            {currentField ? (
              <>
                <label className="oqManualWizardFieldLabel">
                  {currentField.label}
                  <div className="oqInputWithUnit">
                    <input
                      ref={manualInputRef}
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={values[currentField.key]}
                      onChange={(event) =>
                        updateFieldValue(currentField.key, event.target.value, fieldIndex)
                      }
                      onKeyDown={handleManualFieldKeyDown}
                    />
                    <span>{currentField.unit}</span>
                  </div>
                </label>
                <div className="oqManualWizardActions">
                  <button className="oqWizardSecondaryBtn" type="button" onClick={handleBack}>
                    Back
                  </button>
                  <button className="oqWizardPrimaryBtn" type="button" onClick={handleConfirm}>
                    Confirm
                  </button>
                </div>
              </>
            ) : null}

            {step > totalContentSteps ? (
              <>
                <div className="oqManualWizardCompleteMark" aria-hidden>
                  <svg className="oqManualWizardCheckSvg" viewBox="0 0 56 56" width={56} height={56}>
                    <circle className="oqManualWizardCheckCircle" cx="28" cy="28" r="26" />
                    <path
                      className="oqManualWizardCheckPath"
                      d="M17 28.5 L24.5 36 L39 19.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3.25"
                    />
                  </svg>
                </div>
                <h3 className="oqManualWizardTitle">All OQ checks complete</h3>
                <p className="oqManualWizardIntro">Add any summary notes below, then save the OQ upload.</p>
                <button className="oqWizardSecondaryBtn" type="button" onClick={() => setStep(totalContentSteps)}>
                  Back to last step
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
