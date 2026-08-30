"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";

export interface MapLocation {
  id: string;
  code?: string;
  name: string;
  alias?: string;
  temperatureC: number;
  heatPressure?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  clipPath?: string;
  tone: "cool" | "mild" | "warm" | "hot" | "extreme";
  accent?: string;
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

const MIN_SCALE = 1;
const MAX_SCALE = 3.4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface Camera {
  scale: number;
  x: number;
  y: number;
}

export function HeatGrid({ locations, selectedIds, inspectedId, onSelect }: HeatGridProps) {
  const peaks = locations.map((location) => location.temperatureC);
  const peakRange = Math.max(...peaks) - Math.min(...peaks);
  const temperaturePrecision = peakRange < 0.1 ? 2 : 1;
  const uniformPeaks = peakRange < 0.1;
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<Camera>({ scale: 1, x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [camera, setCamera] = useState<Camera>({ scale: 1, x: 0, y: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const hover = locations.find((location) => location.id === hoverId);

  function commit(next: Camera, animate = false) {
    const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE);
    const viewport = viewportRef.current;
    if (!viewport) {
      cameraRef.current = { ...next, scale };
      setCamera({ ...next, scale });
      return;
    }
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const minX = width - width * scale;
    const minY = height - height * scale;
    const settled: Camera = {
      scale,
      x: scale <= 1.01 ? 0 : clamp(next.x, minX, 0),
      y: scale <= 1.01 ? 0 : clamp(next.y, minY, 0),
    };
    cameraRef.current = settled;
    setAnimating(animate);
    setCamera(settled);
  }

  function zoomAt(nextScale: number, clientX: number, clientY: number, animate = false) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const current = cameraRef.current;
    const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    const wx = (mx - current.x) / current.scale;
    const wy = (my - current.y) / current.scale;
    commit({ scale, x: mx - wx * scale, y: my - wy * scale }, animate);
  }

  function fitTiles(tiles: MapLocation[], animate = true) {
    const viewport = viewportRef.current;
    if (!viewport || !tiles.length) return;
    const minX = Math.min(...tiles.map((tile) => tile.x));
    const minY = Math.min(...tiles.map((tile) => tile.y));
    const maxX = Math.max(...tiles.map((tile) => tile.x + tile.width));
    const maxY = Math.max(...tiles.map((tile) => tile.y + tile.height));
    const span = Math.max(maxX - minX, maxY - minY, 12);
    const scale = clamp(78 / span, 1.35, 2.85);
    const cx = ((minX + maxX) / 2 / 100) * viewport.clientWidth;
    const cy = ((minY + maxY) / 2 / 100) * viewport.clientHeight;
    commit({
      scale,
      x: viewport.clientWidth / 2 - cx * scale,
      y: viewport.clientHeight / 2 - cy * scale,
    }, animate);
  }

  useEffect(() => {
    const focus = locations.filter((location) => location.id === inspectedId);
    const picks = locations.filter((location) => selectedIds.includes(location.id));
    const tiles = focus.length ? focus : picks;
    if (!tiles.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = window.requestAnimationFrame(() => fitTiles(tiles, !reduce));
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectedId, selectedIds.join("|")]);

  useEffect(() => {
    if (!animating) return;
    const timer = window.setTimeout(() => setAnimating(false), 580);
    return () => window.clearTimeout(timer);
  }, [animating, camera]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(cameraRef.current.scale * factor, event.clientX, event.clientY);
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
    // zoomAt reads cameraRef so this listener can stay mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest(".map-plot, .map-hud")) return;
    dragRef.current = { x: event.clientX - cameraRef.current.x, y: event.clientY - cameraRef.current.y };
    setAnimating(false);
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    commit({
      scale: cameraRef.current.scale,
      x: event.clientX - dragRef.current.x,
      y: event.clientY - dragRef.current.y,
    });
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function zoomButton(direction: 1 | -1) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    zoomAt(cameraRef.current.scale * (direction > 0 ? 1.22 : 1 / 1.22), rect.left + rect.width / 2, rect.top + rect.height / 2, true);
  }

  return (
    <div className="map-stack">
      <div className="map-stage">
        <div
          className={`thermal-map${dragging ? " is-dragging" : ""}`}
          ref={viewportRef}
          aria-label="Interactive thermal scouting map. Scroll to zoom, drag to pan."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className={`map-world${animating && !dragging ? " is-animating" : ""}`}
            style={{
              transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="map-photo" src="/maps/phoenix-combine.jpg" alt="" draggable={false} />
            <div className="map-heat-veil" aria-hidden="true" />
            <svg
              className="map-underlay"
              viewBox="0 0 760 570"
              role="img"
              aria-labelledby="map-title map-description"
              preserveAspectRatio="xMidYMid slice"
            >
              <title id="map-title">Relative peak-rank map of the active Celsius Scout cohort</title>
              <desc id="map-description">
                {locations.length} selectable tiles over a city underlay. Fill color is relative peak rank inside this cohort
                {uniformPeaks ? ", not a broad Celsius scale. Absolute peaks in this snapshot are nearly uniform." : "."}
              </desc>
              {Array.from({ length: 9 }, (_, index) => (
                <path key={`v-${index}`} d={`M${80 + index * 75} 0 V570`} className="map-grid-line" />
              ))}
              {Array.from({ length: 7 }, (_, index) => (
                <path key={`h-${index}`} d={`M0 ${70 + index * 72} H760`} className="map-grid-line" />
              ))}
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
                      "--plot-accent": location.accent ?? "#8a8176",
                    } as CSSProperties}
                    onClick={() => {
                      onSelect(location.id);
                      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                      fitTiles([location], !reduce);
                    }}
                    onPointerEnter={() => setHoverId(location.id)}
                    onPointerLeave={() => setHoverId((current) => current === location.id ? null : current)}
                    aria-pressed={selected || inspected}
                    aria-label={`${location.alias ?? location.name}, ${location.temperatureC.toFixed(temperaturePrecision)} degrees Celsius peak${hp == null ? "" : `, Heat Pressure ${hp}`}, ${TONE_LABELS[location.tone]}`}
                  >
                    <span className="plot-glow" aria-hidden="true" />
                    <span className="plot-face" style={{ clipPath: location.clipPath }}>
                      <span className="plot-id">{location.code ?? location.id}</span>
                      <span className="plot-hp">{hp == null ? `${location.temperatureC.toFixed(temperaturePrecision)}°` : `HP ${hp}`}</span>
                    </span>
                    {selected ? (
                      <span className="plot-plate" aria-hidden="true">
                        {location.alias ?? location.code ?? location.name}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="map-hud">
            <button type="button" onClick={() => zoomButton(1)} aria-label="Zoom in">+</button>
            <button type="button" onClick={() => zoomButton(-1)} aria-label="Zoom out">−</button>
            <button type="button" onClick={() => commit({ scale: 1, x: 0, y: 0 }, true)} aria-label="Reset map view">1×</button>
            <span>{Math.round(camera.scale * 100)}%</span>
          </div>
          {hover ? (
            <div className="map-tooltip" role="status">
              <strong>{hover.alias ?? hover.name}</strong>
              <span>HP {hover.heatPressure ?? "—"} · {hover.temperatureC.toFixed(temperaturePrecision)}° peak</span>
              <small>{TONE_LABELS[hover.tone]}</small>
            </div>
          ) : null}
        </div>
      </div>
      <p className="map-legend">
        <span>Lower rank</span>
        <i aria-hidden="true" />
        <span>Higher rank</span>
        <small>
          Scroll to zoom, drag to pan, click a tile to inspect.
          {uniformPeaks
            ? " Color is relative peak rank, not a city-scale °C legend. Absolute peaks here differ by less than 0.1°C."
            : " Color is relative peak rank in this cohort, not a universal Celsius scale."}
        </small>
      </p>
    </div>
  );
}
