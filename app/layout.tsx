import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";
import "./styles/shell.css";
import "./styles/missions.css";
import "./styles/map.css";
import "./styles/card.css";
import "./styles/evidence.css";
import "./styles/average.css";

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Celsius Scout — Thermal intelligence, scouted",
  description: "Discover the thermal character of city locations with traceable, cohort-relative scouting cards.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
