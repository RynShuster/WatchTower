"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type MachineDownselectOption = {
  id: string;
  factoryCode: string;
  make: string;
  model: string;
  lineId: string;
  assetId: string;
};

type FactoryOption = {
  code: string;
  label: string;
};

const FACTORY_OPTIONS: FactoryOption[] = [
  { code: "F2", label: "F2 (Torrance, CA)" },
  { code: "F3", label: "F3 (Mesa, AZ)" },
  { code: "F4", label: "F4 (Cherokee, AL)" },
  { code: "FX", label: "FX (Torrance, CA)" },
];

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

type MachineDownselectProps = {
  machines: MachineDownselectOption[];
  /** When set, selects factory/make/model/# for this machine (e.g. health DB edit dialog). */
  initialMachineId?: string;
  /** Notified when the selected machine id changes (including initial sync). */
  onMachineIdChange?: (machineId: string) => void;
  /** If true, omit the hidden `machineId` input (parent submits via fetch/API). */
  omitHiddenInput?: boolean;
};

export function MachineDownselect({
  machines,
  initialMachineId,
  onMachineIdChange,
  omitHiddenInput,
}: MachineDownselectProps) {
  const [factoryCode, setFactoryCode] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [machineId, setMachineId] = useState("");

  const onMachineIdChangeRef = useRef(onMachineIdChange);
  onMachineIdChangeRef.current = onMachineIdChange;

  useEffect(() => {
    if (!initialMachineId) return;
    const found = machines.find((m) => m.id === initialMachineId);
    if (!found) return;
    setFactoryCode(found.factoryCode);
    setMake(found.make);
    setModel(found.model);
    setMachineId(found.id);
  }, [initialMachineId, machines]);

  useEffect(() => {
    onMachineIdChangeRef.current?.(machineId);
  }, [machineId]);

  const makeOptions = useMemo(() => {
    if (!factoryCode) return [];
    return uniqueSorted(machines.filter((m) => m.factoryCode === factoryCode).map((m) => m.make));
  }, [machines, factoryCode]);

  const modelOptions = useMemo(() => {
    if (!factoryCode || !make) return [];
    return uniqueSorted(
      machines.filter((m) => m.factoryCode === factoryCode && m.make === make).map((m) => m.model),
    );
  }, [machines, factoryCode, make]);

  const machineOptions = useMemo(() => {
    if (!factoryCode || !make || !model) return [];
    return machines
      .filter((m) => m.factoryCode === factoryCode && m.make === make && m.model === model)
      .sort((a, b) => a.lineId.localeCompare(b.lineId) || a.assetId.localeCompare(b.assetId));
  }, [machines, factoryCode, make, model]);

  return (
    <div className="oqGrid">
      <label>
        Factory
        <select
          value={factoryCode}
          onChange={(e) => {
            setFactoryCode(e.target.value);
            setMake("");
            setModel("");
            setMachineId("");
          }}
          required
        >
          <option value="" disabled>
            Select factory
          </option>
          {FACTORY_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Make
        <select
          value={make}
          onChange={(e) => {
            setMake(e.target.value);
            setModel("");
            setMachineId("");
          }}
          required
          disabled={!factoryCode}
        >
          <option value="" disabled>
            {factoryCode ? "Select make" : "Select factory first"}
          </option>
          {makeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label>
        Model
        <select
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            setMachineId("");
          }}
          required
          disabled={!make}
        >
          <option value="" disabled>
            {make ? "Select model" : "Select make first"}
          </option>
          {modelOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label>
        Machine #
        <select
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          required
          disabled={!model}
        >
          <option value="" disabled>
            {model ? "Select machine #" : "Select model first"}
          </option>
          {machineOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.lineId} / {option.assetId}
            </option>
          ))}
        </select>
      </label>

      {omitHiddenInput ? null : <input type="hidden" name="machineId" value={machineId} />}
    </div>
  );
}
