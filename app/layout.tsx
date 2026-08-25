import type { Metadata } from "next";
import "./globals.css";

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
