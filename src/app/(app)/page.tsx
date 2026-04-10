import { prisma } from "@/lib/prisma";
import { getHealthDatabaseSubmissions } from "./health-database/healthDatabaseData";

type FactorySite = {
  code: "F2" | "F3" | "F4" | "FX";
  comingSoon?: boolean;
};

const factorySites: FactorySite[] = [
  { code: "F2" },
  { code: "F3" },
  { code: "F4", comingSoon: true },
  { code: "FX" },
];

export default async function OverviewPage() {
  const siteSummaries = await Promise.all(
    factorySites.map(async (site) => {
      const machineCount = await prisma.machine.count({
        where: {
          location: {
            code: site.code,
          },
        },
      });
      const submissions = await getHealthDatabaseSubmissions(site.code);
      const latestSubmissionAt = submissions[0]?.submittedAt ?? null;

      return {
        ...site,
        machineCount,
        latestSubmissionAt,
      };
    }),
  );

  return (
    <div className="overviewPage">
      <h1>WatchTower: Overview</h1>
      <p className="overviewSubtitle">
        Factory-level snapshot with machine totals and room for future KPI tracking.
      </p>

      <div className="overviewSiteGrid">
        {siteSummaries.map((site) => (
          <section key={site.code} className="overviewSiteCard" data-coming-soon={site.comingSoon ? "true" : "false"}>
            <header className="overviewSiteCardHeader">
              <h2>{site.code}</h2>
              {site.comingSoon ? <span className="overviewBadge">Coming Soon</span> : null}
            </header>

            <dl className="overviewStats">
              <div className="overviewStat">
                <dt>Machines</dt>
                <dd>{site.machineCount}</dd>
              </div>
              <div className="overviewStat">
                <dt>Open Requests</dt>
                <dd>-</dd>
              </div>
              <div className="overviewStat">
                <dt>Last Submission</dt>
                <dd>{site.latestSubmissionAt ? new Date(site.latestSubmissionAt).toLocaleDateString() : "-"}</dd>
              </div>
              <div className="overviewStat">
                <dt>Health Score</dt>
                <dd>-</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
