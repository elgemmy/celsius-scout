export interface MapLocation {
  id: string;
  code?: string;
  name: string;
  temperatureC: number;
  heatPressure?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  clipPath?: string;
  tone: "cool" | "mild" | "warm" | "hot" | "extreme";
}

interface HeatGridProps {
  locations: MapLocation[];
  selectedIds: string[];
  onSelect: (id: string) => void;
}

const TONE_LABELS: Record<MapLocation["tone"], string> = {
  cool: "cooler",
  mild: "mild",
  warm: "warm",
  hot: "hot",
  extreme: "hottest",
};

function rosterName(name: string, max = 14): string {
  const compact = name.replace(/^Phoenix 100m\s+/i, "").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}

function plotAriaLabel(location: MapLocation, temperaturePrecision: number): string {
  const peak = `${location.temperatureC.toFixed(temperaturePrecision)} degrees Celsius peak`;
  const band = `${TONE_LABELS[location.tone]} relative peak-rank band`;
  const heatPressure = location.heatPressure == null ? "" : `, Heat Pressure ${location.heatPressure}`;
  return `${location.name}, ${peak}, ${band}${heatPressure}`;
}

export function HeatGrid({ locations, selectedIds, onSelect }: HeatGridProps) {
  const peakRange = Math.max(...locations.map((location) => location.temperatureC)) -
    Math.min(...locations.map((location) => location.temperatureC));
  const temperaturePrecision = peakRange < 0.1 ? 2 : 1;
  return (
    <div className="thermal-map" aria-label="Interactive thermal scouting map">
      <svg
        className="map-underlay"
        viewBox="0 0 760 570"
        role="img"
        aria-labelledby="map-title map-description"
        preserveAspectRatio="none"
      >
        <title id="map-title">Peak temperature map of the active Celsius Scout cohort</title>
        <desc id="map-description">
          A stylized district map with {locations.length} discrete selectable tiles colored from cool teal to hot orange.
        </desc>
        <rect width="760" height="570" rx="30" fill="#13272b" />
        <path d="M-20 92 C140 42 247 138 421 86 S671 70 790 27" className="map-road map-road-wide" />
        <path d="M128 -15 C142 105 96 202 153 305 S229 443 204 600" className="map-road" />
        <path d="M467 -20 C426 124 506 220 477 341 S419 479 463 600" className="map-road" />
        <path d="M-30 405 C155 374 260 452 400 408 S636 342 790 386" className="map-road" />
        <path d="M620 -30 C666 97 639 197 681 290 S741 421 702 600" className="map-water" />
        <g className="map-contours">
          <path d="M16 280 C152 215 250 286 354 232 S584 175 720 234" />
          <path d="M20 318 C153 259 264 325 374 274 S594 220 728 270" />
          <path d="M33 486 C154 454 283 518 407 481 S591 427 704 458" />
        </g>
      </svg>

      <div className="map-north" aria-hidden="true">
        <span>N</span>
        <svg viewBox="0 0 14 24"><path d="m7 0 6 19-6-4-6 4L7 0Z" /></svg>
      </div>

      <div className="map-plots">
        {locations.map((location) => {
          const selected = selectedIds.includes(location.id);
          const code = location.code ?? location.id;
          const peakLabel = `${location.temperatureC.toFixed(temperaturePrecision)}°`;
          return (
            <button
              key={location.id}
              type="button"
              className={`map-plot map-plot--${location.tone}${selected ? " is-selected" : ""}`}
              style={{
                left: `${location.x}%`,
                top: `${location.y}%`,
                width: `${location.width}%`,
                height: `${location.height}%`,
              }}
              onClick={() => onSelect(location.id)}
              aria-pressed={selected}
              aria-label={plotAriaLabel(location, temperaturePrecision)}
            >
              <span
                className="plot-face"
                style={location.clipPath ? { clipPath: location.clipPath } : undefined}
                aria-hidden="true"
              />
              {selected ? (
                <span className="plot-nameplate">
                  <b>{code}</b>
                  <span>{rosterName(location.name)}</span>
                </span>
              ) : (
                <span className="plot-id">{code}</span>
              )}
              <span className="plot-rating">
                {location.heatPressure == null ? (
                  <strong>{peakLabel}</strong>
                ) : (
                  <>
                    <strong>{location.heatPressure}</strong>
                    <span className="plot-hp-unit">HP</span>
                  </>
                )}
              </span>
              {location.heatPressure != null ? <span className="plot-peak">{peakLabel}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="map-legend" aria-label="Relative peak-rank legend">
        <span>Lower peak rank</span>
        <i aria-hidden="true" />
        <span>Higher peak rank</span>
      </div>
    </div>
  );
}
