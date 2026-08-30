import type { CelsiusScoutAnalysis } from "../lib";

export function RatingsGuide({ analysis }: { analysis: CelsiusScoutAnalysis }) {
  const comfortInput = analysis.cohort.source.kind === "fortyguard"
    ? "This temperature-only snapshot has no humidity, wind, or supplied apparent temperature, so Comfort is unavailable."
    : "This demo includes humidity and wind inputs for the documented apparent-temperature proxy.";
  return (
    <section className="ratings-guide" id="how-it-works" aria-labelledby="ratings-guide-title">
      <header className="ratings-guide-intro">
        <div><p className="eyebrow">FIELD GUIDE / METRIC DEFINITIONS</p><h2 id="ratings-guide-title">What every stat represents</h2></div>
        <p>Cards pair a raw measurement with a 0–100 rating. The rating is an average-rank percentile inside <strong>{analysis.cohort.name}</strong> only; it is not a universal city score.</p>
      </header>
      <div className="ratings-guide-grid">
        <article><span className="guide-code">HP</span><h3>Heat Pressure</h3><p><strong>50% Peak percentile + 50% Stamina percentile.</strong> A compact description of relative thermal intensity—not comfort, danger, health risk, or overall quality.</p></article>
        <article><span className="guide-code">PEAK</span><h3>Peak</h3><p>The highest captured temperature in the active time series. The raw value is °C; a higher rating means a higher maximum relative to this cohort.</p></article>
        <article><span className="guide-code">STA</span><h3>Stamina</h3><p>The longest uninterrupted, linearly interpolated run above <strong>{analysis.cohort.thresholdC}°C</strong>. It is duration, not temperature, and stays separate from total exceedance.</p></article>
        <article><span className="guide-code">REC</span><h3>Recovery</h3><p>The supported post-peak cooling trend from ordinary least squares, shown in °C/hour. A faster cooling trend earns a higher rating; insufficient post-peak samples produce “Unavailable.”</p></article>
        <article><span className="guide-code">COM</span><h3>Comfort</h3><p>A lower time-weighted apparent temperature earns a higher rating. It requires supplied apparent temperature or complete humidity-and-wind inputs. {comfortInput}</p></article>
        <article><span className="guide-code">CHA</span><h3>Chaos</h3><p>The interquartile range of successive changes in temperature-change rates. A higher rating means a more irregular profile, not randomness or measurement error.</p></article>
        <article><span className="guide-code">SUR</span><h3>Surprise</h3><p>The size of a location’s median same-hour deviation from the nearest sampled cohort tiles. The rating uses absolute size; the raw sign preserves direction: positive is hotter, negative is cooler.</p></article>
        <article><span className="guide-code">RAW</span><h3>Supporting evidence</h3><p>Exceedance is total interpolated time above the threshold. Peak time is the earliest observed maximum. The time-weighted mean integrates the full series instead of averaging sample rows.</p></article>
      </div>
      <footer className="ratings-guide-notes">
        <div><strong>How percentiles behave</strong><p>The cohort minimum maps to 0 and maximum to 100. Ties share their average rank; if every value ties, each receives 50. Missing inputs remain unavailable and do not enter the ranking.</p></div>
        <div><strong>Active data provenance</strong><p>{analysis.cohort.source.label}. Ratings change when the cohort, window, threshold, or available inputs change, so compare cards only within the active board.</p></div>
        <div><strong>Claim boundary</strong><p>These are descriptive scouting comparisons. They do not establish medical risk, safety, statistical significance, causes, forecasts, or intervention effects.</p></div>
      </footer>
    </section>
  );
}
