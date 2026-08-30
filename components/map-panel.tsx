import { HeatGrid } from "./heat-grid";
import type { ScoutLocation } from "./scout-view";

export function MapPanel({
  locations,
  selectedIds,
  isObserved,
  onSelect,
}: {
  locations: ScoutLocation[];
  selectedIds: string[];
  isObserved: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="map-panel"><div className="panel-heading"><div><p className="eyebrow">02 / SCAN THE COHORT</p><h2>Phoenix board</h2></div><div className="map-key"><i /><span>Mission picks</span></div></div><HeatGrid locations={locations} selectedIds={selectedIds} onSelect={onSelect} /><div className="map-caption"><span>Select a tile to inspect its evidence</span><span>{isObserved ? "Returned FortyGuard 100 m polygon footprints" : "Synthetic point fixture shown as discrete footprints"}</span></div></section>
  );
}
