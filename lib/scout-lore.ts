export interface ScoutPersona {
  alias: string;
  epithet: string;
  pitch: string;
  portrait: string;
}

/** Combine framing only. It does not change measured values. */
export const snapshotStory =
  "The Phoenix Combine froze a 100 m grid on 18 August 2026 from 10:00 to 20:00. Almost every tile ran the same brutal marathon — peaks sit within a tenth of a degree. Scouts are not hunting a rainforest. They are hunting a tell: who hides a spike in a dead-even field, who is quietly cooler, who flickers.";

export const demoStory =
  "The Combine's practice pitch: ten fictional grounds shaped so every archetype shows up. Use it when you need contrast the historical snapshot cannot honestly provide.";

export const scoutPersonas: Record<string, ScoutPersona> = {
  "fg-tile-000": {
    alias: "Static Ember",
    epithet: "Chaos spark",
    pitch: "The noisiest heartbeat in an even field. Same desert, more flicker.",
    portrait: "/scouts/static-ember.jpg",
  },
  "fg-tile-003": {
    alias: "Glitch Mirage",
    epithet: "Second spark",
    pitch: "A twin flicker to Static Ember — slightly quieter, still a tell.",
    portrait: "/scouts/glitch-mirage.jpg",
  },
  "fg-tile-006": {
    alias: "Quiet Kiln",
    epithet: "Low even",
    pitch: "Keeps the same long heat as the pack, without the drama.",
    portrait: "/scouts/quiet-kiln.jpg",
  },
  "fg-tile-015": {
    alias: "Midday Clerk",
    epithet: "Office heat",
    pitch: "The middle of the pack. Useful as the comparison, not the headline.",
    portrait: "/scouts/midday-clerk.jpg",
  },
  "fg-tile-019": {
    alias: "Sandglass",
    epithet: "Slow pour",
    pitch: "Same window, same stamina. The hourglass that does not rush.",
    portrait: "/scouts/sandglass.jpg",
  },
  "fg-tile-024": {
    alias: "Low Ember",
    epithet: "Soft kiln",
    pitch: "Another even runner. Watch this one beside the sparks.",
    portrait: "/scouts/low-ember.jpg",
  },
  "fg-tile-033": {
    alias: "Copper Pulse",
    epithet: "Warm even",
    pitch: "A balanced operator with a slightly louder overall.",
    portrait: "/scouts/copper-pulse.jpg",
  },
  "fg-tile-035": {
    alias: "Shade Debt",
    epithet: "Coolest even",
    pitch: "Still above 38°C all day — just the lowest Heat Pressure in this freeze-frame.",
    portrait: "/scouts/shade-debt.jpg",
  },
  "fg-tile-038": {
    alias: "Even Hand",
    epithet: "Referee",
    pitch: "The median citizen of the combine. Use them to read everyone else.",
    portrait: "/scouts/even-hand.jpg",
  },
  "fg-tile-041": {
    alias: "Captain Even",
    epithet: "Fraud watch",
    pitch: "The thermal-fraud pick: the average looks calm, the peak still wins the argument.",
    portrait: "/scouts/captain-even.jpg",
  },
  glassworks: {
    alias: "Glassworks",
    epithet: "The Furnace",
    pitch: "Hardscape that holds the day's highest fire.",
    portrait: "/scouts/glassworks.jpg",
  },
  "canal-steps": {
    alias: "Canal Steps",
    epithet: "The Oasis",
    pitch: "The breezy low line. The coolest practice pitch.",
    portrait: "/scouts/canal-steps.jpg",
  },
  "night-market": {
    alias: "Night Market",
    epithet: "The Night Owl",
    pitch: "Peaks after the others clock out.",
    portrait: "/scouts/night-market.jpg",
  },
  "marathon-apron": {
    alias: "Transit Apron",
    epithet: "The Marathoner",
    pitch: "Not the tallest spike — the longest sit above the line.",
    portrait: "/scouts/transit-apron.jpg",
  },
  "comeback-park": {
    alias: "Comeback Park",
    epithet: "The Comeback Kid",
    pitch: "Climbs hard, then dumps heat faster than the pack.",
    portrait: "/scouts/comeback-park.jpg",
  },
  "chaos-courtyard": {
    alias: "Patchwork Yard",
    epithet: "The Chaos Merchant",
    pitch: "The jagged practice profile, built so Chaos has a face.",
    portrait: "/scouts/patchwork-yard.jpg",
  },
  "balanced-arcade": {
    alias: "Library Arcade",
    epithet: "The Balanced Operator",
    pitch: "The textbook middle child of the practice pitch.",
    portrait: "/scouts/library-arcade.jpg",
  },
  "shade-pavilion": {
    alias: "Shade Pavilion",
    epithet: "The Oasis",
    pitch: "A cooler cousin of Canal Steps, still in the shade story.",
    portrait: "/scouts/shade-pavilion.jpg",
  },
  "warehouse-roof": {
    alias: "Warehouse Roof",
    epithet: "Hot neighbor",
    pitch: "The practice roof that sits hotter than its friends.",
    portrait: "/scouts/warehouse-roof.jpg",
  },
  "steady-court": {
    alias: "Steady Court",
    epithet: "The Oasis",
    pitch: "Slow, even, and milder than the furnaces.",
    portrait: "/scouts/steady-court.jpg",
  },
};

export function personaFor(id: string): ScoutPersona | undefined {
  return scoutPersonas[id];
}
