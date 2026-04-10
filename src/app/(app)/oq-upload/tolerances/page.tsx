import { prisma } from "@/lib/prisma";
import { OQUploadSubnav } from "../OQUploadSubnav";
import toleranceDefinitions from "../toleranceDefinitions.json";
import "@/app/oq-upload.css";

type ToleranceRule = {
  type?: string;
  operator?: string;
  threshold?: number;
  description?: string;
};

type ToleranceOverride = {
  displayValue?: string;
  rule?: ToleranceRule;
};

function formatRule(rule?: ToleranceRule) {
  if (!rule) return "";
  if (rule.description) return rule.description;
  if (rule.operator && typeof rule.threshold === "number") {
    return `${rule.operator} ${rule.threshold}`;
  }
  return rule.type ?? "";
}

export default async function OQUploadTolerancesPage() {
  const makes = await prisma.machineMake.findMany({
    orderBy: { name: "asc" },
    include: {
      models: {
        orderBy: { name: "asc" },
      },
    },
  });

  return (
    <div className="oqRoot">
      <header className="oqHeader">
        <h1>OQ Tolerances</h1>
        <p>
          Reference tables for each machine model, grouped by make, with placeholder fields for OQ tolerance
          targets.
        </p>
      </header>

      <OQUploadSubnav currentPage="tolerances" />

      {makes.map((make) => (
        <section key={make.id} className="oqSection">
          <div className="oqSectionHeading">
            <h2>{make.name}</h2>
            <p className="oqSectionNote">
              {make.models.length} model{make.models.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="oqToleranceGrid">
            {make.models.map((model) => (
              <article key={model.id} className="oqToleranceCard">
                <h3>{model.name}</h3>
                <table className="oqToleranceTable">
                  <thead>
                    <tr>
                      <th scope="col">Measurement</th>
                      <th scope="col">Detail</th>
                      <th scope="col">Tolerance</th>
                      <th scope="col">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toleranceDefinitions.tolerances.map((row) => {
                      const modelOverrides = (
                        toleranceDefinitions.machineOverrides as Record<string, Record<string, ToleranceOverride>>
                      )?.[model.name];
                      const override = modelOverrides?.[row.id];
                      const ruleText = formatRule(override?.rule);

                      return (
                        <tr key={`${model.id}-${row.id}`}>
                          <td>{row.test}</td>
                          <td>{row.detail}</td>
                          <td>
                            {override?.displayValue ? (
                              <div className="oqToleranceValueStack">
                                <span>{override.displayValue}</span>
                                {ruleText ? <small>{ruleText}</small> : null}
                              </div>
                            ) : (
                              <span className="oqTolerancePlaceholder" />
                            )}
                          </td>
                          <td>{row.unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
