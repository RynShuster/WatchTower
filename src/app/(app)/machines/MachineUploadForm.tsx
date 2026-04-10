"use client";

import { useEffect, useMemo, useState } from "react";
import { locationOptions, type MachineLocationCode } from "./locationOptions";

export type MachineUploadOption = {
  id: string;
  label: string;
};

export type MachineFormValues = {
  makeId: string;
  modelId: string;
  typeId: string;
  locationCode: MachineLocationCode;
  serial: string;
  internalAssetId: string;
  line: string;
};

type MachineUploadFormProps = {
  makeOptions: MachineUploadOption[];
  modelOptions: Array<MachineUploadOption & { makeId: string }>;
  typeOptions: MachineUploadOption[];
  initialValues?: MachineFormValues;
};

export function MachineUploadForm({
  makeOptions,
  modelOptions,
  typeOptions,
  initialValues,
}: MachineUploadFormProps) {
  const [selectedMakeId, setSelectedMakeId] = useState(initialValues?.makeId ?? makeOptions[0]?.id ?? "");
  const [selectedLocationCode, setSelectedLocationCode] = useState<MachineLocationCode>(
    initialValues?.locationCode ?? locationOptions[0].code,
  );

  const filteredModels = useMemo(
    () => modelOptions.filter((option) => option.makeId === selectedMakeId),
    [modelOptions, selectedMakeId],
  );
  const [selectedModelId, setSelectedModelId] = useState(initialValues?.modelId ?? "");

  const selectedSite =
    locationOptions.find((option) => option.code === selectedLocationCode)?.site ?? "";

  useEffect(() => {
    if (filteredModels.some((option) => option.id === selectedModelId)) {
      return;
    }
    setSelectedModelId(filteredModels[0]?.id ?? "");
  }, [filteredModels, selectedModelId]);

  return (
    <>
      <div className="machineUploadGrid">
        <label>
          Make
          <select
            name="makeId"
            value={selectedMakeId}
            onChange={(event) => setSelectedMakeId(event.target.value)}
            required
          >
            {makeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Model
          <select
            name="modelId"
            value={selectedModelId}
            onChange={(event) => setSelectedModelId(event.target.value)}
            required
            disabled={filteredModels.length === 0}
          >
            {filteredModels.length === 0 ? (
              <option value="">No models available</option>
            ) : (
              filteredModels.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))
            )}
          </select>
        </label>

        <label>
          Type
          <select name="typeId" required defaultValue={initialValues?.typeId ?? typeOptions[0]?.id ?? ""}>
            {typeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Location
          <select
            name="locationCode"
            value={selectedLocationCode}
            onChange={(event) => setSelectedLocationCode(event.target.value as MachineLocationCode)}
            required
          >
            {locationOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code}
              </option>
            ))}
          </select>
        </label>

        <label>
          City / State
          <input type="text" value={selectedSite} readOnly aria-readonly="true" />
        </label>

        <label>
          Serial ID
          <input name="serial" type="text" maxLength={120} required defaultValue={initialValues?.serial ?? ""} />
        </label>

        <label>
          Asset ID
          <input
            name="internalAssetId"
            type="text"
            maxLength={120}
            required
            defaultValue={initialValues?.internalAssetId ?? ""}
          />
        </label>

        <label>
          Line ID
          <input name="line" type="text" maxLength={120} required defaultValue={initialValues?.line ?? ""} />
        </label>
      </div>
    </>
  );
}
