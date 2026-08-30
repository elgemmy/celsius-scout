import type { CSSProperties } from "react";
import { Sparkline } from "./sparkline";
import { metricsFor, type ScoutLocation } from "./scout-view";

export function ScoutCard({ location, thresholdC }: { location: ScoutLocation; thresholdC: number }) {
  return (
    <article className="scout-card" style={{ "--card-accent": location.accent } as CSSProperties} aria-label={`${location.name} thermal player card`}>
      <div className="card-holo" aria-hidden="true" />
      <header className="card-topline"><div><span className="card-overall">{location.heatPressure}</span><span className="card-overall-label">HP</span></div><div className="card-edition"><span>{location.dataBadge}</span><strong>SCOUT / {location.number}</strong></div></header>
      <div className="card-pressure-label">HEAT PRESSURE · RELATIVE TO COHORT</div>
      <div className="card-portrait" aria-hidden="true"><span className="sun-disc" /><svg viewBox="0 0 320 155" preserveAspectRatio="none"><path d="M0 138 42 84l39 31 41-73 42 76 47-55 37 41 40-72 32 50v73H0Z" fill="currentColor" opacity=".18" /><path d="M-10 138c62-29 103-19 161 2s113 10 179-23v48H-10Z" fill="currentColor" opacity=".32" /></svg><span className="card-location-code">{location.code}</span></div>
      <div className="card-identity"><p>{location.label}</p><h2>{location.name}</h2><span>{location.archetype}</span></div>
      <div className="card-spark"><div className="spark-meta"><span>{location.startTime}</span><strong>{location.temperatureLabel}° peak · {location.peakTime}</strong><span>{location.endTime}</span></div><Sparkline values={location.sparkline} accent={location.accent} /></div>
      <div className="card-stats">{metricsFor(thresholdC).map((metric) => { const value = location.metrics[metric.key]; return <div key={metric.key} aria-label={`${metric.label}: ${value.percentile === null ? "unavailable" : `percentile ${value.percentile}`}; ${value.raw}. ${metric.hint}`}><strong>{value.percentile === null ? "—" : value.percentile}</strong><span>{metric.label}</span><small>{value.raw}</small></div>; })}</div>
      <footer className="card-footer"><span>Ratings = cohort percentiles</span><strong>{location.dataBadge === "SNAPSHOT" ? "FORTYGUARD × CELSIUS SCOUT" : "SYNTHETIC DEMO × CELSIUS SCOUT"}</strong></footer>
    </article>
  );
}
