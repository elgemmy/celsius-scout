export interface ScoutPersona {
  alias: string;
  epithet: string;
  pitch: string;
  portrait: string;
  suit: string;
}

/** Combine framing only. It does not change measured values. */
export const snapshotStory =
  "Welcome to the Phoenix Combine, a cartoon league that drafts superheroes out of city heat. On 18 August 2026 the scouts froze a 100 m grid from 10:00 to 20:00. Almost every tile ran the same brutal marathon. Powers here are tiny tells in a dead-even field: who flickers, who hides a spike, who is quietly cooler.";

export const demoStory =
  "The Combine's practice pitch: ten fictional grounds, each with a full-powered archetype. Use Demo when you want Furnaces, Oases, Night Owls, and Comeback Kids on the same board.";

export const scoutPersonas: Record<string, ScoutPersona> = {
  "fg-tile-000": {
    alias: "Volt Spark",
    epithet: "Static Supercharge",
    pitch: "Shoots comic-book sparks whenever the field looks too even. Chaos Merchant energy.",
    portrait: "/scouts/static-ember.jpg?v=2",
    suit: "#c5d84a",
  },
  "fg-tile-003": {
    alias: "Echo Clone",
    epithet: "Mirage Split",
    pitch: "Leaves afterimages of herself. A second Chaos spark, slightly quieter.",
    portrait: "/scouts/glitch-mirage.jpg?v=2",
    suit: "#d46ad4",
  },
  "fg-tile-006": {
    alias: "Kiln Kid",
    epithet: "Pocket Forge",
    pitch: "Carries a tiny cartoon kiln. Same long heat as the pack, no fireworks.",
    portrait: "/scouts/quiet-kiln.jpg?v=2",
    suit: "#c47a4a",
  },
  "fg-tile-015": {
    alias: "Stampede",
    epithet: "Solar Stamp",
    pitch: "Slams a glowing sun-stamp at noon. The comparison hero of the middle pack.",
    portrait: "/scouts/midday-clerk.jpg?v=2",
    suit: "#d4a03a",
  },
  "fg-tile-019": {
    alias: "Hourglass",
    epithet: "Slow-Mo Sand",
    pitch: "Pours golden sand to stretch the hottest hour. Never rushes.",
    portrait: "/scouts/sandglass.jpg?v=2",
    suit: "#c9a15b",
  },
  "fg-tile-024": {
    alias: "Pip Ember",
    epithet: "Mini Flame",
    pitch: "A pocket fire-sprite sidekick. Soft heat, easy to miss beside the sparks.",
    portrait: "/scouts/low-ember.jpg?v=2",
    suit: "#c47a78",
  },
  "fg-tile-033": {
    alias: "Coil",
    epithet: "Copper Magnet",
    pitch: "Bends warm metal like spaghetti. A louder balanced operator.",
    portrait: "/scouts/copper-pulse.jpg?v=2",
    suit: "#c87533",
  },
  "fg-tile-035": {
    alias: "Umbrella Shade",
    epithet: "Cool-Shadow",
    pitch: "Summons a giant cartoon parasol. Still above 38°C — just the lowest Heat Pressure here.",
    portrait: "/scouts/shade-debt.jpg?v=2",
    suit: "#3d8a78",
  },
  "fg-tile-038": {
    alias: "Scale",
    epithet: "Balance Beam",
    pitch: "Walks a glowing seesaw. The median hero you read everyone else against.",
    portrait: "/scouts/even-hand.jpg?v=2",
    suit: "#8a8176",
  },
  "fg-tile-041": {
    alias: "Peak Captain",
    epithet: "Mean Masker",
    pitch: "The fraud-watch captain: cape looks calm, peak still wins the argument.",
    portrait: "/scouts/captain-even.jpg?v=2",
    suit: "#d4a24c",
  },
  glassworks: {
    alias: "Magma Max",
    epithet: "Furnace Punch",
    pitch: "Hardscape hero who holds the day's tallest fireball.",
    portrait: "/scouts/glassworks.jpg?v=2",
    suit: "#e25a2a",
  },
  "canal-steps": {
    alias: "Ripple",
    epithet: "Canal Surge",
    pitch: "Rides a water-slide of canal spray. Coolest practice pitch.",
    portrait: "/scouts/canal-steps.jpg?v=2",
    suit: "#1f8a86",
  },
  "night-market": {
    alias: "Moonheat",
    epithet: "Night Peak",
    pitch: "Sleeps through noon, explodes after dark.",
    portrait: "/scouts/night-market.jpg?v=2",
    suit: "#6b5cae",
  },
  "marathon-apron": {
    alias: "Endless",
    epithet: "Never Stops",
    pitch: "Not the tallest spike — the longest sit above the line.",
    portrait: "/scouts/transit-apron.jpg?v=2",
    suit: "#d4892a",
  },
  "comeback-park": {
    alias: "Frostback",
    epithet: "Heat Dump",
    pitch: "Spikes, then blasts cartoon ice breath and dumps the heat.",
    portrait: "/scouts/comeback-park.jpg?v=2",
    suit: "#68d8ff",
  },
  "chaos-courtyard": {
    alias: "Scribble",
    epithet: "Reality Doodle",
    pitch: "Draws jagged weather on the air. Chaos with a face.",
    portrait: "/scouts/patchwork-yard.jpg?v=2",
    suit: "#c5d84a",
  },
  "balanced-arcade": {
    alias: "Even Steven",
    epithet: "Textbook",
    pitch: "The practice-pitch middle child. Equilibrium field.",
    portrait: "/scouts/library-arcade.jpg?v=2",
    suit: "#8a8176",
  },
  "shade-pavilion": {
    alias: "Canopy",
    epithet: "Living Shade",
    pitch: "Grows a tree in three seconds. Oasis energy.",
    portrait: "/scouts/shade-pavilion.jpg?v=2",
    suit: "#2aa38a",
  },
  "warehouse-roof": {
    alias: "Tar Cap",
    epithet: "Hot Neighbor",
    pitch: "The roof that sits hotter than its friends. Sticky-heat hero.",
    portrait: "/scouts/warehouse-roof.jpg?v=2",
    suit: "#c45a32",
  },
  "steady-court": {
    alias: "Stillwater",
    epithet: "Calm Pool",
    pitch: "Barely ripples. Slow, even, milder than the furnaces.",
    portrait: "/scouts/steady-court.jpg?v=2",
    suit: "#4aa0a8",
  },
};

export function personaFor(id: string): ScoutPersona | undefined {
  return scoutPersonas[id];
}
