import type { AverageMaskingSummary, CelsiusScoutAnalysis } from "../lib";

export function AveragePanel({
  analysis,
  averageMasking,
}: {
  analysis: CelsiusScoutAnalysis;
  averageMasking: AverageMaskingSummary;
}) {
  const isObserved = analysis.cohort.source.kind === "fortyguard";
  const narrowSnapshotSpread = isObserved && averageMasking.spatialMeanRangeC < 0.1;
  const spatialPrecision = averageMasking.spatialMeanRangeC < 0.1 ? 3 : 1;

  return (
    <section
      className={narrowSnapshotSpread ? "average-panel is-uniform" : "average-panel"}
      aria-labelledby="average-title"
    >
      <div className="average-intro">
        <p className="eyebrow">DERIVED EXPERIENCE / THE AVERAGE IS LYING</p>
        <h2 id="average-title">
          {narrowSnapshotSpread
            ? "This snapshot is nearly spatially uniform."
            : "One number hides the local spread."}
        </h2>
        <p>
          {narrowSnapshotSpread
            ? `The selected tile means differ by only ${averageMasking.spatialMeanRangeC.toFixed(spatialPrecision)}°C. This proves the captured-data path, but it is not strong evidence of heterogeneous local heat.`
            : `The broad cohort mean is ${averageMasking.representativeMeanC.toFixed(1)}°C, but the local time-weighted means span ${averageMasking.spatialMeanRangeC.toFixed(spatialPrecision)}°C. The scout keeps the distribution visible.`}
        </p>
      </div>
      <div className="average-stats">
        <div className="average-stat">
          <span>Broad mean</span>
          <strong>{averageMasking.representativeMeanC.toFixed(spatialPrecision)}°C</strong>
          <small>mean of local time-weighted means</small>
        </div>
        <div className="average-stat">
          <span>Local range</span>
          <strong>
            {averageMasking.coolestMeanC.toFixed(spatialPrecision)}–{averageMasking.hottestMeanC.toFixed(spatialPrecision)}°C
          </strong>
          <small>
            {averageMasking.coolestLocation.name} → {averageMasking.hottestLocation.name}
          </small>
        </div>
        <div className="average-stat">
          <span>Exposure share</span>
          <strong>{averageMasking.tileHoursAboveThresholdPercent.toFixed(1)}%</strong>
          <small>of captured tile-hours above {analysis.cohort.thresholdC}°C</small>
        </div>
      </div>
    </section>
  );
}
