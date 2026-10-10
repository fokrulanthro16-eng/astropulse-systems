import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AstroPulse Systems | NASA Space Apps Challenge 2026",
  description: "Production-ready astronaut biometric telemetry & real-time anomaly detection engine.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full bg-[#05080e] text-slate-100 antialiased">
      <body className="min-h-full flex flex-col bg-[#05080e] selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
