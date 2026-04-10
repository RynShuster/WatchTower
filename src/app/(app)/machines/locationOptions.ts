export const locationOptions = [
  { code: "F2", site: "Torrance, CA" },
  { code: "FX", site: "Torrance, CA" },
  { code: "F3", site: "Mesa, AZ" },
  { code: "F4", site: "Cherokee, AL" },
] as const;

export type MachineLocationCode = (typeof locationOptions)[number]["code"];

export const locationSiteByCode = Object.fromEntries(
  locationOptions.map((option) => [option.code, option.site]),
) as Record<MachineLocationCode, string>;

export function isMachineLocationCode(value: string): value is MachineLocationCode {
  return value in locationSiteByCode;
}
