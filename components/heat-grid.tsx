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
  inspectedId?: string;
  onSelect: (id: string) => void;
}

const TONE_LABELS: Record<MapLocation["tone"], string> = {
  cool: "lower relative peak rank",
  mild: "below-median relative peak rank",
  warm: "mid relative peak rank",
  hot: "higher relative peak rank",
  extreme: "highest relative peak rank",
};

export function HeatGrid({ locations, selectedIds, inspectedId, onSelect }: HeatGridProps) {
  const peaks = locations.map((location) => location.temperatureC);
  const peakRange = Math.max(...peaks) - Math.min(...peaks);
  const temperaturePrecision = peakRange < 0.1 ? 2 : 1;
  const uniformPeaks = peakRange < 0.1;

  return (
    <div className="map-stack">
    <div className="thermal-map" aria-label="Interactive thermal scouting map">
      <svg
        className="map-underlay"
        viewBox="0 0 760 570"
        role="img"
        aria-labelledby="map-title map-description"
        preserveAspectRatio="xMidYMid slice"
      >
        <title id="map-title">Relative peak-rank map of the active Celsius Scout cohort</title>
        <desc id="map-description">
          {locations.length} selectable tiles. Fill color is relative peak rank inside this cohort
          {uniformPeaks ? ", not a broad Celsius scale. Absolute peaks in this snapshot are nearly uniform." : "."}
        </desc>
        <rect width="760" height="570" rx="28" fill="#2a241c" />
        <path d="M-20 92 C140 42 247 138 421 86 S671 70 790 27" className="map-road map-road-wide" />
        <path d="M128 -15 C142 105 96 202 153 305 S229 443 204 600" className="map-road" />
        <path d="M467 -20 C426 124 506 220 477 341 S419 479 463 600" className="map-road" />
        <path d="M-30 405 C155 374 260 452 400 408 S636 342 790 386" className="map-road" />
        <path d="M620 -30 C666 97 639 197 681 290 S741 421 702 600" className="map-water" />
      </svg>

      <div className="map-plots">
        {locations.map((location) => {
          const selected = selectedIds.includes(location.id);
          const inspected = inspectedId === location.id;
          const hp = location.heatPressure;
          return (
            <button
              key={location.id}
              type="button"
              className={`map-plot map-plot--${location.tone}${selected ? " is-selected" : ""}${inspected ? " is-inspected" : ""}`}
              style={{
                left: `${location.x}%`,
                top: `${location.y}%`,
                width: `${location.width}%`,
                height: `${location.height}%`,
              }}
              onClick={() => onSelect(location.id)}
              aria-pressed={selected || inspected}
              aria-label={`${location.name}, ${location.temperatureC.toFixed(temperaturePrecision)} degrees Celsius peak${hp == null ? "" : `, Heat Pressure ${hp}`}, ${TONE_LABELS[location.tone]}`}
            >
              <span className="plot-face" style={{ clipPath: location.clipPath }}>
                <span className="plot-id">{location.code ?? location.id}</span>
                <span className="plot-hp">{hp == null ? `${location.temperatureC.toFixed(temperaturePrecision)}°` : `HP ${hp}`}</span>
              </span>
              {selected ? (
                <span className="plot-plate" aria-hidden="true">
                  {location.code ?? location.name}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

    </div>
      <p className="map-legend">
        <span>Lower rank</span>
        <i aria-hidden="true" />
        <span>Higher rank</span>
        <small>{uniformPeaks ? "Color is relative peak rank, not a city-scale °C legend. Absolute peaks here differ by less than 0.1°C." : "Color is relative peak rank in this cohort, not a universal Celsius scale."}</small>
      </p>
    </div>
  );
}
