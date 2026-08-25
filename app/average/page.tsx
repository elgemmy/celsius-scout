import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  analyzeCohort,
  demoCohort,
  findSimilarAverageDifferentBehaviorPair,
  summarizeAverageMasking,
  type ScoutedLocation,
} from "@/lib";
import styles from "./average.module.css";

export const metadata: Metadata = {
  title: "The Average Is Lying — Celsius Scout",
  description:
    "See how one broad temperature average hides local spread, persistence, and different thermal behavior.",
};

const analysis = analyzeCohort(demoCohort);
const summary = summarizeAverageMasking(analysis);
const maximumMeanDifferenceC = 1;
const twins = findSimilarAverageDifferentBehaviorPair(
  analysis,
  maximumMeanDifferenceC,
);

type DistributionStyle = CSSProperties & {
  "--mean-position": string;
  "--average-position": string;
  "--persistence-width": string;
};

function decimal(value: number): string {
  return value.toFixed(1);
}

function hours(value: number | null): string {
  return value === null ? "Unavailable" : `${decimal(value)} h`;
}

function localTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: analysis.cohort.timezone,
  }).format(new Date(timestamp));
}

function distributionStyle(location: ScoutedLocation): DistributionStyle {
  const minimum = summary.coolestLocation.features.meanTemperatureC;
  const maximum = summary.hottestLocation.features.meanTemperatureC;
  const range = maximum - minimum || 1;
  const meanPosition =
    ((location.features.meanTemperatureC - minimum) / range) * 100;
  const averagePosition =
    ((summary.representativeMeanC - minimum) / range) * 100;
  const persistenceWidth =
    (location.features.longestPersistenceHours /
      location.features.observedDurationHours) *
    100;

  return {
    "--mean-position": `${Math.min(100, Math.max(0, meanPosition))}%`,
    "--average-position": `${Math.min(100, Math.max(0, averagePosition))}%`,
    "--persistence-width": `${Math.min(100, Math.max(0, persistenceWidth))}%`,
  };
}

function TemperatureProfile({ location }: { location: ScoutedLocation }) {
  const values = location.samples.map((sample) => sample.temperatureC);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const width = 420;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = 72 - ((value - minimum) / range) * 52;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      className={styles.profileChart}
      viewBox={`0 0 ${width} 92`}
      role="img"
      aria-label={`${location.name} temperature profile from ${decimal(minimum)} to ${decimal(maximum)} degrees Celsius`}
    >
      <path d={`M0 20H${width}M0 46H${width}M0 72H${width}`} />
      <polyline points={points} />
      <circle
        cx={(values.indexOf(maximum) / Math.max(1, values.length - 1)) * width}
        cy="20"
        r="5"
      />
    </svg>
  );
}

function ComparisonCard({ location, side }: { location: ScoutedLocation; side: string }) {
  const { features } = location;

  return (
    <article className={styles.comparisonCard}>
      <header>
        <div>
          <span>{side}</span>
          <h3>{location.name}</h3>
        </div>
        <strong>{location.archetype.name}</strong>
      </header>
      <TemperatureProfile location={location} />
      <dl className={styles.profileFacts}>
        <div>
          <dt>Time-weighted mean</dt>
          <dd>{decimal(features.meanTemperatureC)}°C</dd>
        </div>
        <div>
          <dt>Observed peak</dt>
          <dd>{decimal(features.peakTemperatureC)}°C</dd>
        </div>
        <div>
          <dt>Longest persistence</dt>
          <dd>{hours(features.longestPersistenceHours)}</dd>
        </div>
        <div>
          <dt>Total exceedance</dt>
          <dd>{hours(features.totalExceedanceHours)}</dd>
        </div>
        <div>
          <dt>Recovery</dt>
          <dd>
            {features.recoveryRateCPerHour === null
              ? "Unavailable"
              : `${decimal(features.recoveryRateCPerHour)}°C/h`}
          </dd>
        </div>
        <div>
          <dt>Peak time</dt>
          <dd>{localTime(features.peakTimestamp)}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function AveragePage() {
  const distribution = [...analysis.locations].sort(
    (first, second) =>
      first.features.meanTemperatureC - second.features.meanTemperatureC ||
      first.id.localeCompare(second.id),
  );

  return (
    <main className={styles.page}>
      <header className={styles.siteHeader}>
        <Link href="/" className={styles.wordmark} aria-label="Back to Celsius Scout">
          <span className={styles.wordmarkMark} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            CELSIUS<strong>SCOUT</strong>
          </span>
        </Link>
        <span className={styles.routeLabel}>FIELD NOTE / 01</span>
        <Link href="/" className={styles.backLink}>
          Back to scouting board <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <section className={styles.hero} aria-labelledby="average-hero-title">
        <div className={styles.heroCopy}>
          <div className={styles.heroMeta}>
            <span className={styles.syntheticBadge}>SYNTHETIC DEMO</span>
            <span>{analysis.cohort.name}</span>
          </div>
          <p className={styles.eyebrow}>DERIVED EXPERIENCE / THE AVERAGE IS LYING</p>
          <h1 id="average-hero-title">
            One average.
            <em>{analysis.cohort.locationCount} local stories.</em>
          </h1>
          <p className={styles.heroLead}>
            The broad mean says <strong>{decimal(summary.representativeMeanC)}°C</strong>.
            The local profiles stretch across {decimal(summary.spatialMeanRangeC)}°C,
            and locations with similar means can carry very different thermal
            behavior.
          </p>
        </div>

        <aside className={styles.heroCallout} aria-label="Main finding">
          <span>THE SINGLE NUMBER</span>
          <strong>{decimal(summary.representativeMeanC)}°C</strong>
          <p>Useful as context. Misleading when treated as the whole local story.</p>
        </aside>
      </section>

      <section className={styles.summaryGrid} aria-label="Cohort evidence summary">
        <article>
          <span>Local mean range</span>
          <strong>
            {decimal(summary.coolestMeanC)}–{decimal(summary.hottestMeanC)}°C
          </strong>
          <small>{decimal(summary.spatialMeanRangeC)}°C between the local endpoints</small>
        </article>
        <article>
          <span>Tile-hours above threshold</span>
          <strong>{decimal(summary.tileHoursAboveThresholdPercent)}%</strong>
          <small>Observed time above {analysis.cohort.thresholdC}°C across all locations</small>
        </article>
        <article>
          <span>Above / below broad mean</span>
          <strong>
            {summary.hotterThanRepresentativeCount} / {summary.coolerThanRepresentativeCount}
          </strong>
          <small>Locations on either side of {decimal(summary.representativeMeanC)}°C</small>
        </article>
        <article>
          <span>Comparison cohort</span>
          <strong>{analysis.cohort.locationCount} locations</strong>
          <small>{analysis.cohort.source.label}</small>
        </article>
      </section>

      <section className={styles.distributionSection} aria-labelledby="distribution-title">
        <header className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>01 / OPEN THE DISTRIBUTION</p>
            <h2 id="distribution-title">The mean is a line. The city is a spread.</h2>
          </div>
          <p>
            Every dot is a local time-weighted mean. The line beneath it shows that
            location’s longest continuous run above {analysis.cohort.thresholdC}°C.
          </p>
        </header>

        <div className={styles.distributionCard}>
          <div className={styles.distributionScale} aria-hidden="true">
            <span>{decimal(summary.coolestMeanC)}°C</span>
            <span>Broad mean {decimal(summary.representativeMeanC)}°C</span>
            <span>{decimal(summary.hottestMeanC)}°C</span>
          </div>
          <div className={styles.distributionRows}>
            {distribution.map((location) => {
              const aboveAverage =
                location.features.meanTemperatureC > summary.representativeMeanC;
              return (
                <article
                  key={location.id}
                  className={styles.distributionRow}
                  style={distributionStyle(location)}
                  aria-label={`${location.name}: mean ${decimal(location.features.meanTemperatureC)} degrees Celsius; longest persistence ${hours(location.features.longestPersistenceHours)}`}
                >
                  <div className={styles.locationIdentity}>
                    <strong>{location.name}</strong>
                    <span>{location.archetype.name}</span>
                  </div>
                  <div className={styles.meanTrack} aria-hidden="true">
                    <i className={aboveAverage ? styles.hotDot : styles.coolDot} />
                    <span className={styles.averageRule} />
                  </div>
                  <strong className={styles.meanValue}>
                    {decimal(location.features.meanTemperatureC)}°C
                  </strong>
                  <div className={styles.persistenceTrack} aria-hidden="true">
                    <i />
                  </div>
                  <span className={styles.persistenceValue}>
                    {hours(location.features.longestPersistenceHours)} stamina
                  </span>
                </article>
              );
            })}
          </div>
          <footer className={styles.distributionFooter}>
            <p>
              <strong>Cool endpoint:</strong> {summary.coolestLocation.name} at {decimal(summary.coolestMeanC)}°C
            </p>
            <p>
              <strong>Hot endpoint:</strong> {summary.hottestLocation.name} at {decimal(summary.hottestMeanC)}°C
            </p>
          </footer>
        </div>
      </section>

      <section className={styles.twinsSection} aria-labelledby="twins-title">
        <header className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>02 / SCOUT THE DIFFERENCE</p>
            <h2 id="twins-title">Similar average. Different thermal character.</h2>
          </div>
          <p>{twins.answer} The tool compares the full profile, not just one summary.</p>
        </header>

        <div className={styles.toolEvidence}>
          <div>
            <span>Executed tool</span>
            <code>{twins.tool}()</code>
          </div>
          <div>
            <span>Mean difference</span>
            <strong>{decimal(twins.data.meanDifferenceC)}°C</strong>
          </div>
          <div>
            <span>Behavior distance</span>
            <strong>{decimal(twins.data.behaviorDistance)} percentile pts</strong>
          </div>
          <div>
            <span>Selection status</span>
            <strong>
              {twins.data.usedFallback
                ? "Closest-mean fallback"
                : `Within requested ${decimal(maximumMeanDifferenceC)}°C`}
            </strong>
          </div>
        </div>

        <div className={styles.comparisonGrid}>
          <ComparisonCard location={twins.data.first} side="PLAYER A" />
          <div className={styles.versus} aria-hidden="true">VS</div>
          <ComparisonCard location={twins.data.second} side="PLAYER B" />
        </div>
      </section>

      <section className={styles.methodSection} aria-labelledby="method-title">
        <div>
          <p className={styles.eyebrow}>03 / READ THE RECEIPTS</p>
          <h2 id="method-title">Same engine. No invented numbers.</h2>
        </div>
        <div className={styles.methodBody}>
          <p>
            <strong>Deterministic path:</strong> <code>analyzeCohort()</code> →{" "}
            <code>summarizeAverageMasking()</code> →{" "}
            <code>findSimilarAverageDifferentBehaviorPair()</code>.
          </p>
          <p>
            The broad mean is the mean of local time-weighted means. Persistence is
            the longest interpolated run above the visible threshold. This fixture is
            synthetic and descriptive; it does not make causal, health, or safety claims.
          </p>
        </div>
        <Link href="/" className={styles.primaryLink}>
          Return to Celsius Scout <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </main>
  );
}
