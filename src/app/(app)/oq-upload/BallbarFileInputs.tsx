type BallbarInput = {
  name: "xyFile" | "xzFile" | "yzFile";
  label: "XY" | "XZ" | "YZ";
};

const inputs: BallbarInput[] = [
  { name: "xyFile", label: "XY" },
  { name: "xzFile", label: "XZ" },
  { name: "yzFile", label: "YZ" },
];

export function BallbarFileInputs() {
  return (
    <div className="oqFileStack">
      {inputs.map((entry) => (
        <label key={entry.name}>
          {entry.label}
          <input name={entry.name} type="file" />
        </label>
      ))}
    </div>
  );
}
