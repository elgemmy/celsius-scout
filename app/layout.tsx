import type { Metadata } from "next";
import "./globals.css";
import "./styles/shell.css";
import "./styles/missions.css";
import "./styles/map.css";
import "./styles/card.css";
import "./styles/evidence.css";
import "./styles/average.css";

export const metadata: Metadata = {
  title: "Celsius Scout — Thermal intelligence, scouted",
  description: "Discover the thermal character of city locations with traceable, cohort-relative scouting cards.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
