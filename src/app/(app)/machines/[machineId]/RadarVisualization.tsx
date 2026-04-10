"use client";

import { useEffect, useMemo, useState } from "react";

type RatioPoint = {
  label: string;
  ratio: number;
  measurement: string;
  /** Radial position on radar (0 = center); when absent, derived from `ratio`. */
  radarRadiusNorm?: number;
  /** Band coloring (green…red); when absent, `ratio` is used. */
  conditionRatio?: number;
};

type RatioTrendSeries = {
  label: string;
  points: Array<{
    date: string;
    ratio: number | null;
  }>;
};

type RadarSnapshot = {
  submissionId: string;
  submittedAt: string;
  ratioPoints: RatioPoint[];
};

type RadarVisualizationProps = {
  radarSnapshots: RadarSnapshot[];
  trendSeries: RatioTrendSeries[];
};

type ConditionBand = "outOfSpec" | "high" | "mid" | "low";

const trendLineColors = [
  "#2563eb",
  "#9333ea",
  "#0f766e",
  "#b45309",
  "#be185d",
  "#0369a1",
  "#4d7c0f",
  "#dc2626",
];
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const EDGE_BUFFER_MS = ONE_DAY_MS * 0.15;
const TREND_X_AXIS_EXPANSION = 1.5;
const TREND_Y_LABEL_MIN_GUTTER = 44;
const TREND_LEFT_FRAME_BUFFER = 40;

function getConditionBand(ratio: number): ConditionBand {
  if (ratio > 1) return "outOfSpec";
  if (ratio >= 0.85) return "high";
  if (ratio >= 0.65) return "mid";
  return "low";
}

function bandForPoint(point: RatioPoint): ConditionBand {
  return getConditionBand(point.conditionRatio ?? point.ratio);
}

const conditionVisuals: Record<
  ConditionBand,
  {
    buttonBg: string;
    buttonBgActive: string;
    buttonBorder: string;
    dotFill: string;
    dotStroke: string;
  }
> = {
  outOfSpec: {
    buttonBg: "rgb(254 242 242)",
    buttonBgActive: "rgb(252 165 165)",
    buttonBorder: "#fca5a5",
    dotFill: "#ef4444",
    dotStroke: "#7f1d1d",
  },
  high: {
    buttonBg: "rgb(255 237 213)",
    buttonBgActive: "rgb(253 186 116)",
    buttonBorder: "#fdba74",
    dotFill: "#f59e0b",
    dotStroke: "#78350f",
  },
  mid: {
    buttonBg: "rgb(254 249 195)",
    buttonBgActive: "rgb(250 204 21)",
    buttonBorder: "#fde047",
    dotFill: "#eab308",
    dotStroke: "#713f12",
  },
  low: {
    buttonBg: "#d9ffe6",
    buttonBgActive: "#7cf5ac",
    buttonBorder: "#86efac",
    dotFill: "#22c55e",
    dotStroke: "#14532d",
  },
};

export function RadarVisualization({ radarSnapshots, trendSeries }: RadarVisualizationProps) {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>(() => radarSnapshots[0]?.submissionId ?? "");
  const [selectedRadarLabels, setSelectedRadarLabels] = useState<string[]>([]);
  const [selectedTrendLabels, setSelectedTrendLabels] = useState<string[]>([]);
  const [hoveredRadarLabel, setHoveredRadarLabel] = useState<string | null>(null);
  const [hoveredTrendLabel, setHoveredTrendLabel] = useState<string | null>(null);

  const radarWidth = 624;
  const radarHeight = 624;
  const radarCenterX = radarWidth / 2;
  const radarCenterY = radarHeight / 2;
  const radarRadius = 258;
  const maxDisplayRatio = 1.2;
  const ringSteps = [0.2, 0.4, 0.6, 0.8, 1, 1.2];
  const trendWidth = 624;
  const trendHeight = 624;
  const trendCanvasWidth = trendWidth + TREND_LEFT_FRAME_BUFFER;
  const trendMargin = { top: 40, right: 28, bottom: 70, left: 70 };
  const trendPlotWidth = trendWidth - trendMargin.left - trendMargin.right;
  const trendPlotHeight = trendHeight - trendMargin.top - trendMargin.bottom;
  const trendEdgeInset = 36;
  const baseTrendPlotLeft = trendMargin.left + trendEdgeInset;
  const baseTrendPlotRight = trendWidth - trendMargin.right - trendEdgeInset;
  const baseTrendPlotWidth = Math.max(1, baseTrendPlotRight - baseTrendPlotLeft);
  const expandedTrendPlotWidth = Math.min(baseTrendPlotWidth * TREND_X_AXIS_EXPANSION, trendWidth - 16);
  const baseTrendPlotCenter = (baseTrendPlotLeft + baseTrendPlotRight) / 2;
  const trendPlotLeft = Math.max(TREND_Y_LABEL_MIN_GUTTER, baseTrendPlotCenter - expandedTrendPlotWidth / 2);
  const trendPlotRight = Math.min(trendWidth - 8, baseTrendPlotCenter + expandedTrendPlotWidth / 2);

  const selectedSnapshot = useMemo(
    () => radarSnapshots.find((snapshot) => snapshot.submissionId === selectedSnapshotId) ?? radarSnapshots[0] ?? null,
    [radarSnapshots, selectedSnapshotId],
  );
  const activeRatioPoints = selectedSnapshot?.ratioPoints ?? [];
  const outOfSpecCount = activeRatioPoints.filter((point) => point.ratio > 1).length;
  const radarBackgroundFill = useMemo(() => {
    if (activeRatioPoints.some((point) => point.ratio > 1)) {
      return "rgb(254 242 242)"; // very light red
    }
    if (activeRatioPoints.some((point) => bandForPoint(point) === "high")) {
      return "rgb(255 237 213)"; // light orange
    }
    if (activeRatioPoints.some((point) => bandForPoint(point) === "mid")) {
      return "rgb(254 249 195)"; // light yellow
    }
    return "rgb(220 252 231)"; // light green
  }, [activeRatioPoints]);

  const chartPoints = useMemo(
    () =>
      activeRatioPoints.map((point, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(activeRatioPoints.length, 1) - Math.PI / 2;
        const normalized =
          point.radarRadiusNorm !== undefined
            ? point.radarRadiusNorm
            : Math.min(Math.max(point.ratio, 0), maxDisplayRatio) / maxDisplayRatio;
        const x = radarCenterX + Math.cos(angle) * radarRadius * normalized;
        const y = radarCenterY + Math.sin(angle) * radarRadius * normalized;
        const edgeX = radarCenterX + Math.cos(angle) * radarRadius;
        const edgeY = radarCenterY + Math.sin(angle) * radarRadius;
        return {
          ...point,
          x,
          y,
          edgeX,
          edgeY,
        };
      }),
    [activeRatioPoints],
  );

  useEffect(() => {
    if (!radarSnapshots.length) return;
    if (radarSnapshots.some((snapshot) => snapshot.submissionId === selectedSnapshotId)) return;
    setSelectedSnapshotId(radarSnapshots[0].submissionId);
  }, [radarSnapshots, selectedSnapshotId]);

  useEffect(() => {
    if (!selectedSnapshot) return;
    const validLabels = new Set(selectedSnapshot.ratioPoints.map((point) => point.label));
    setSelectedRadarLabels((prev) => prev.filter((label) => validLabels.has(label)));
    setHoveredRadarLabel((prev) => (prev && validLabels.has(prev) ? prev : null));
  }, [selectedSnapshot]);

  const radarPath = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const trendTimestamps = useMemo(
    () =>
      Array.from(new Set(trendSeries.flatMap((series) => series.points.map((point) => Date.parse(point.date)))))
        .filter((timestamp) => Number.isFinite(timestamp))
        .sort((a, b) => a - b),
    [trendSeries],
  );
  const [trendMinX, trendMaxX] = trendTimestamps.length
    ? [trendTimestamps[0], trendTimestamps[trendTimestamps.length - 1]]
    : [0, 1];
  const trendDomainMinX = trendMinX - EDGE_BUFFER_MS;
  const trendDomainMaxX = trendMaxX + EDGE_BUFFER_MS;
  const trendMaxRatio = useMemo(() => {
    const allRatios = trendSeries.flatMap((series) => series.points.map((point) => point.ratio).filter((ratio): ratio is number => ratio !== null));
    const highestRatio = allRatios.length ? Math.max(...allRatios, 1.2) : 1.2;
    return Math.ceil(highestRatio / 0.2) * 0.2;
  }, [trendSeries]);
  const yStepCount = Math.max(1, Math.ceil(trendMaxRatio / 0.2));
  const yTicks = Array.from({ length: yStepCount + 1 }, (_, index) => Number((index * 0.2).toFixed(10)));
  const xTickTimestamps = trendTimestamps.length <= 2
    ? trendTimestamps
    : [trendTimestamps[0], trendTimestamps[Math.floor(trendTimestamps.length / 2)], trendTimestamps[trendTimestamps.length - 1]];

  function scaleX(timestamp: number) {
    if (trendDomainMaxX === trendDomainMinX) return (trendPlotLeft + trendPlotRight) / 2;
    const innerWidth = Math.max(1, trendPlotRight - trendPlotLeft);
    return (
      TREND_LEFT_FRAME_BUFFER +
      trendPlotLeft +
      ((timestamp - trendDomainMinX) / (trendDomainMaxX - trendDomainMinX)) * innerWidth
    );
  }

  function scaleY(ratio: number) {
    return trendMargin.top + trendPlotHeight - (Math.max(0, Math.min(ratio, trendMaxRatio)) / trendMaxRatio) * trendPlotHeight;
  }

  function buildTrendPath(points: Array<{ date: string; ratio: number | null }>) {
    const coords = points
      .map((point) => {
        if (point.ratio === null) return null;
        const timestamp = Date.parse(point.date);
        if (!Number.isFinite(timestamp)) return null;
        return { x: scaleX(timestamp), y: scaleY(point.ratio) };
      })
      .filter((value): value is { x: number; y: number } => Boolean(value));
    if (coords.length < 2) return "";
    return coords.map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`).join(" ");
  }

  function toggleRadarSelection(label: string) {
    setSelectedRadarLabels((prev) => (prev.includes(label) ? prev.filter((value) => value !== label) : [...prev, label]));
  }

  function toggleTrendSelection(label: string) {
    setSelectedTrendLabels((prev) => (prev.includes(label) ? prev.filter((value) => value !== label) : [...prev, label]));
  }

  function renderToggleButtons(prefix: string, showMeasurements: boolean) {
    return (
      <div className="machineSummaryVizButtonGrid">
        {chartPoints.map((point) => {
          const selected = selectedRadarLabels.includes(point.label);
          const hovered = hoveredRadarLabel === point.label;
          const showMeasurementActive = selected || hovered;
          const emphasized = selected || hovered;
          const visuals = conditionVisuals[bandForPoint(point)];
          return (
            <div
              key={`${prefix}-toggle-row-${point.label}`}
              className={`machineSummaryVizToggleRow${showMeasurements ? "" : " isCompact"}`}
            >
              <button
                type="button"
                className={`machineSummaryVizToggle${selected ? " isSelected" : ""}`}
                style={{
                  background: emphasized ? visuals.buttonBgActive : visuals.buttonBg,
                  borderColor: visuals.buttonBorder,
                }}
                onClick={() => toggleRadarSelection(point.label)}
                onMouseEnter={() => {
                  if (!selected) setHoveredRadarLabel(point.label);
                }}
                onMouseLeave={() => {
                  setHoveredRadarLabel((current) => (current === point.label ? null : current));
                }}
              >
                <span>{point.label}</span>
              </button>
              {showMeasurements ? (
                <span className={`machineSummaryVizMeasurement${showMeasurementActive ? " isActive" : ""}`}>{point.measurement}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  function renderTrendToggleButtons() {
    return (
      <div className="machineSummaryVizButtonGrid">
        {trendSeries.map((series) => {
          const selected = selectedTrendLabels.includes(series.label);
          const hovered = hoveredTrendLabel === series.label;
          const emphasized = selected || hovered;
          const seriesIndex = trendSeries.findIndex((item) => item.label === series.label);
          const lineColor = trendLineColors[(seriesIndex >= 0 ? seriesIndex : 0) % trendLineColors.length];
          const disengagedBackground = `${lineColor}12`;
          const engagedBackground = `${lineColor}40`;
          return (
            <div key={`trend-toggle-row-${series.label}`} className="machineSummaryVizToggleRow isCompact">
              <button
                type="button"
                className={`machineSummaryVizToggle${selected ? " isSelected" : ""}`}
                style={{
                  borderColor: lineColor,
                  background: emphasized ? engagedBackground : disengagedBackground,
                }}
                onClick={() => toggleTrendSelection(series.label)}
                onMouseEnter={() => setHoveredTrendLabel(series.label)}
                onMouseLeave={() => setHoveredTrendLabel((current) => (current === series.label ? null : current))}
              >
                <span>{series.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="machineSummaryVizGrid">
        <div className="machineSummaryVizChartColumn">
          <div className="machineSummaryVizMainRow">
            <div className="machineSummaryVizChartStack">
              <div className="machineSummaryVizTitleRow">
                <h3 className="machineSummaryVizTitle">OQ Check Results</h3>
                <label className="machineSummaryVizSnapshotSelectLabel">
                  <span>Test Date and Time</span>
                  <select
                    className="machineSummaryVizSnapshotSelect"
                    value={selectedSnapshot?.submissionId ?? ""}
                    onChange={(event) => setSelectedSnapshotId(event.target.value)}
                  >
                    {radarSnapshots.map((snapshot) => (
                      <option key={snapshot.submissionId} value={snapshot.submissionId}>
                        {new Date(snapshot.submittedAt).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <svg
                viewBox={`0 0 ${radarWidth} ${radarHeight}`}
                className="machineSummaryRadar"
                aria-label="Machine health ratio radar"
              >
                <circle cx={radarCenterX} cy={radarCenterY} r={radarRadius} fill={radarBackgroundFill} />
                {ringSteps.map((r) => {
                  const isSpecLimit = r === 1;
                  const scaledRadius = radarRadius * (r / maxDisplayRatio);
                  return (
                    <circle
                      key={r}
                      cx={radarCenterX}
                      cy={radarCenterY}
                      r={scaledRadius}
                      fill="none"
                      stroke={isSpecLimit ? "#b91c1c" : "#cbd5e1"}
                      strokeWidth={isSpecLimit ? "1.5" : "1"}
                      strokeDasharray={isSpecLimit ? "6 4" : undefined}
                    />
                  );
                })}
                <g className="machineSummaryVizSpecLegend">
                  <line x1={radarWidth - 138} y1={28} x2={radarWidth - 102} y2={28} stroke="#b91c1c" strokeWidth="2" strokeDasharray="6 4" />
                  <text x={radarWidth - 96} y={32} className="machineSummaryVizSpecLegendLabel">
                    Spec Limit
                  </text>
                </g>
                {ringSteps.map((r) => {
                  const y = radarCenterY - radarRadius * (r / maxDisplayRatio);
                  return (
                    <text key={`ring-label-${r}`} x={radarCenterX + 8} y={y + 4} className="machineSummaryVizScaleLabel">
                      {Math.round(r * 100)}%
                    </text>
                  );
                })}
                {chartPoints.map((point) => (
                  <line
                    key={`axis-${point.label}`}
                    x1={radarCenterX}
                    y1={radarCenterY}
                    x2={point.edgeX}
                    y2={point.edgeY}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                ))}
                {radarPath ? <path d={`${radarPath} Z`} fill="rgb(59 130 246 / 0.2)" stroke="#2563eb" strokeWidth="2" /> : null}
                {chartPoints
                  .filter((point) => selectedRadarLabels.includes(point.label))
                  .map((point) => (
                    (() => {
                      const visuals = conditionVisuals[bandForPoint(point)];
                      return (
                    <circle
                      key={`selected-${point.label}`}
                      cx={point.x}
                      cy={point.y}
                      r={6}
                      fill={visuals.dotFill}
                      stroke={visuals.dotStroke}
                      strokeWidth={1.5}
                    />
                      );
                    })()
                  ))}
                {hoveredRadarLabel && !selectedRadarLabels.includes(hoveredRadarLabel)
                  ? chartPoints
                      .filter((point) => point.label === hoveredRadarLabel)
                      .map((point) => {
                        const visuals = conditionVisuals[bandForPoint(point)];
                        return (
                          <circle
                            key={`hover-${point.label}`}
                            cx={point.x}
                            cy={point.y}
                            r={6}
                            fill={visuals.dotFill}
                            stroke={visuals.dotStroke}
                            strokeWidth={1.5}
                            opacity={0.75}
                          />
                        );
                      })
                  : null}
              </svg>
            </div>
            <div className="machineSummaryVizLegend machineSummaryVizLegendWithMeasurements">
              {renderToggleButtons("radar", true)}
            </div>
            <div className="machineSummaryVizColumnSpacer" aria-hidden />
            <div className="machineSummaryVizChartStack">
              <h3 className="machineSummaryVizTitle">OQ Upload Results</h3>
              <svg
                viewBox={`0 0 ${trendCanvasWidth} ${trendHeight}`}
                className="machineSummaryTrendChart"
                aria-label="Upload trend line chart"
              >
                {yTicks.map((tick) => {
                  const y = scaleY(tick);
                  return (
                    <g key={`trend-y-${tick}`}>
                      <line
                        x1={TREND_LEFT_FRAME_BUFFER + trendPlotLeft}
                        y1={y}
                        x2={TREND_LEFT_FRAME_BUFFER + trendPlotRight}
                        y2={y}
                        className="machineSummaryTrendGridLine"
                      />
                      <text
                        x={TREND_LEFT_FRAME_BUFFER + trendPlotLeft - 5}
                        y={y + 4}
                        textAnchor="end"
                        className="machineSummaryTrendTickLabel"
                      >
                        {Math.round(tick * 100)}%
                      </text>
                    </g>
                  );
                })}
                {xTickTimestamps.map((timestamp) => (
                  <g key={`trend-x-${timestamp}`}>
                    <line
                      x1={scaleX(timestamp)}
                      y1={trendMargin.top}
                      x2={scaleX(timestamp)}
                      y2={trendHeight - trendMargin.bottom}
                      className="machineSummaryTrendGridLine"
                    />
                    <text
                      x={scaleX(timestamp)}
                      y={trendHeight - trendMargin.bottom + 20}
                      textAnchor="middle"
                      className="machineSummaryTrendTickLabel"
                    >
                      {new Date(timestamp).toLocaleDateString()}
                    </text>
                  </g>
                ))}
                {trendSeries.map((series) => {
                  const seriesIndex = trendSeries.findIndex((item) => item.label === series.label);
                  const pathData = buildTrendPath(series.points);
                  if (!pathData) return null;
                  const color = trendLineColors[seriesIndex % trendLineColors.length];
                  const isActive = selectedTrendLabels.includes(series.label) || hoveredTrendLabel === series.label;
                  return (
                    <path
                      key={`trend-line-${series.label}`}
                      d={pathData}
                      fill="none"
                      stroke={color}
                      strokeWidth={isActive ? "2.6" : "2.1"}
                      strokeOpacity={isActive ? "1" : "0.2"}
                    />
                  );
                })}
                <text
                  x={TREND_LEFT_FRAME_BUFFER + trendWidth / 2}
                  y={trendHeight - 16}
                  textAnchor="middle"
                  className="machineSummaryTrendAxisLabel"
                >
                  Upload Date
                </text>
                <text
                  x={20}
                  y={trendHeight / 2}
                  transform={`rotate(-90 20 ${trendHeight / 2})`}
                  textAnchor="middle"
                  className="machineSummaryTrendAxisLabel"
                >
                  (% of tolerance)
                </text>
              </svg>
            </div>
            <div className="machineSummaryVizLegend machineSummaryVizLegendCompact">{renderTrendToggleButtons()}</div>
          </div>
        </div>
      </div>
      <div className="machineSummaryVizSummary">
        <p className="machineSummaryVizNote">
          Each leg is measurement / tolerance rule threshold (0–1 in spec, {`>`}1 out of spec). Draw bar force uses
          a rescaled band from the minimum spec to 22 kN for radar distance and for green/yellow/orange; out-of-spec
          (below minimum) still uses the true ratio and red.
        </p>
        <p className="machineSummaryVizStatus">
          Out of spec: <strong>{outOfSpecCount}</strong> / {activeRatioPoints.length}
        </p>
      </div>
    </>
  );
}
