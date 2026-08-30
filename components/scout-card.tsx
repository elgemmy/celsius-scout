import type { CSSProperties } from "react";
import { Sparkline } from "./sparkline";
import { metricsFor, type ScoutLocation } from "./scout-view";

export function ScoutCard({ location, thresholdC }: { location: ScoutLocation; thresholdC: number }) {
  return (
    <article
      className="scout-card"
      style={{ "--card-accent": location.accent } as CSSProperties}
      aria-label={`${location.name} thermal player card`}
    >
      <div className="card-holo" aria-hidden="true" />
      <header className="card-topline">
        <div>
          <span className="card-overall">{location.heatPressure}</span>
          <span className="card-overall-label">HP</span>
        </div>
        <div className="card-edition">
          <span>{location.dataBadge}</span>
          <strong>SCOUT / {location.number}</strong>
        </div>
      </header>
      <div className="card-pressure-label">HEAT PRESSURE · RELATIVE TO COHORT</div>
      <div className="card-portrait">
        <Sparkline values={location.sparkline} accent={location.accent} />
        <div className="spark-meta">
          <span>{location.startTime}</span>
          <strong>{location.temperatureLabel}° peak · {location.peakTime}</strong>
          <span>{location.endTime}</span>
        </div>
      </div>
      <div className="card-identity">
        <h2>{location.code}</h2>
        <p>{location.name}</p>
        <span className="card-archetype">{location.archetype}</span>
      </div>
      <div className="card-stats">
        {metricsFor(thresholdC).map((metric) => {
          const value = location.metrics[metric.key];
          const unavailable = value.percentile === null;
          return (
            <div
              key={metric.key}
              className={unavailable ? "is-void" : undefined}
              aria-label={`${metric.label}: ${unavailable ? "unavailable" : `percentile ${value.percentile}`}; ${value.raw}. ${metric.hint}`}
            >
              <strong>{unavailable ? "Unavailable" : value.percentile}</strong>
              <span>{metric.label}</span>
              <small>{value.raw}</small>
            </div>
          );
        })}
      </div>
      <footer className="card-footer">
        <span>Ratings = cohort percentiles</span>
        <strong>{location.dataBadge === "SNAPSHOT" ? "FORTYGUARD × CELSIUS SCOUT" : "SYNTHETIC DEMO × CELSIUS SCOUT"}</strong>
      </footer>
    </article>
  );
}
