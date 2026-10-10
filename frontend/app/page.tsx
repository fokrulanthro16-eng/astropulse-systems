"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/Header";
import { CrewSelector } from "@/components/CrewSelector";
import { AnomalyAlertBanner } from "@/components/AnomalyAlertBanner";
import { MetricGauges } from "@/components/MetricGauges";
import { LiveVitalsChart } from "@/components/LiveVitalsChart";
import { CountermeasuresCard } from "@/components/CountermeasuresCard";
import { SimulationControlModal } from "@/components/SimulationControlModal";
import { ClinicalChecklistDrawer } from "@/components/ClinicalChecklistDrawer";
import { MicrogravityDegradationTracker } from "@/components/MicrogravityDegradationTracker";
import { 
  TelemetryPacket, 
  CrewOverviewItem, 
  SimulationStatus, 
  ChartDataPoint, 
  SimulationMode 
} from "@/lib/types";
import { cockpitAudio } from "@/lib/audio";
import { Shield, Radio, Terminal, AlertOctagon, Zap, Database, Bluetooth, Dna } from "lucide-react";

const BACKEND_HTTP = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const BACKEND_WS = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/telemetry";

export default function AstroPulseDashboard() {
  const [telemetry, setTelemetry] = useState<TelemetryPacket | null>(null);
  const [crewOverview, setCrewOverview] = useState<CrewOverviewItem[]>([]);
  const [selectedAstronautId, setSelectedAstronautId] = useState<string>("CDR-01");
  const [chartHistory, setChartHistory] = useState<ChartDataPoint[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [isSimModalOpen, setIsSimModalOpen] = useState<boolean>(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState<boolean>(false);
  const [isAnalyticsViewActive, setIsAnalyticsViewActive] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial simulation status
  const fetchSimulationStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_HTTP}/api/simulate/status`);
      if (res.ok) {
        const data = await res.json();
        setSimulationStatus(data);
      }
    } catch {
      // Backend starting up
    }
  }, []);

  // WebSocket Telemetry Connection
  useEffect(() => {
    fetchSimulationStatus();

    let isMounted = true;
    console.log("[AstroPulse] Effect mounted for astronaut:", selectedAstronautId);

    function connectWs() {
      if (!isMounted) return;

      const wsUrl = `${BACKEND_WS}?astronaut_id=${selectedAstronautId}`;
      console.log("[AstroPulse] Creating WebSocket connection to:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[AstroPulse] WebSocket ONOPEN!");
        if (!isMounted) return;
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const envelope = JSON.parse(event.data);
          if (envelope.type === "TELEMETRY_UPDATE") {
            const activePacket: TelemetryPacket = envelope.active_astronaut;
            setTelemetry(activePacket);

            if (envelope.crew_overview) {
              setCrewOverview(envelope.crew_overview);
            }

            // Append to rolling chart history (keep last 40 seconds)
            const dateObj = new Date(activePacket.timestamp);
            const timeStr = dateObj.toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            const newPoint: ChartDataPoint = {
              timeStr,
              timestamp: dateObj.getTime(),
              heartRate: activePacket.vitals.heart_rate,
              spo2: activePacket.vitals.spo2,
              hrv: activePacket.vitals.hrv_rmssd,
              cabinCo2: activePacket.vitals.cabin_co2,
            };

            setChartHistory((prev) => {
              const next = [...prev, newPoint];
              return next.length > 40 ? next.slice(next.length - 40) : next;
            });

            // Trigger Audio Feedback
            if (activePacket.overall_status === "CRITICAL") {
              cockpitAudio.playCriticalKlaxon();
            } else if (activePacket.overall_status === "WARNING") {
              cockpitAudio.playWarningAlert();
            } else {
              cockpitAudio.playNominalPulse();
            }
          }
        } catch (err) {
          console.error("Telemetry parsing error:", err);
        }
      };

      ws.onclose = (event) => {
        console.log("[AstroPulse] WebSocket ONCLOSE! Code:", event.code, "isMounted:", isMounted);
        if (!isMounted) return;
        setIsConnected(false);
        reconnectTimerRef.current = setTimeout(connectWs, 2000);
      };

      ws.onerror = (err) => {
        console.log("[AstroPulse] WebSocket ONERROR!", err);
        ws.close();
      };
    }

    connectWs();

    return () => {
      console.log("[AstroPulse] Effect cleanup!");
      isMounted = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedAstronautId, fetchSimulationStatus]);

  // Switch astronaut
  const handleSelectAstronaut = (astroId: string) => {
    setSelectedAstronautId(astroId);
    setChartHistory([]);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          command: "select_astronaut",
          astronaut_id: astroId,
        })
      );
    }
  };

  // Toggle Cockpit Audio
  const handleToggleAudio = () => {
    const muted = cockpitAudio.toggleMute();
    setIsAudioMuted(muted);
  };

  // Trigger Crisis Scenario via API
  const handleTriggerScenario = async (
    mode: SimulationMode,
    overrides?: { spo2?: number; hr?: number; co2?: number }
  ) => {
    try {
      const body: Record<string, unknown> = {
        mode,
        astronaut_id: selectedAstronautId,
      };
      if (overrides?.spo2) body.custom_spo2_target = overrides.spo2;
      if (overrides?.hr) body.custom_hr_target = overrides.hr;
      if (overrides?.co2) body.custom_co2_override = overrides.co2;

      const res = await fetch(`${BACKEND_HTTP}/api/simulate/crisis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setSimulationStatus(data);
      }
    } catch (err) {
      console.error("Crisis simulation trigger failed:", err);
    }
  };

  // Quick Crisis Toggle Button
  const handleQuickToggleCrisis = async () => {
    const targetMode: SimulationMode =
      simulationStatus?.is_crisis_active ? "NORMAL" : "HYPOXIA_CRITICAL";
    await handleTriggerScenario(targetMode);
  };

  // Trigger Automated Closed-Loop Clinical Recovery (15s trajectory)
  const handleTriggerClosedLoopRecovery = async () => {
    try {
      const res = await fetch(`${BACKEND_HTTP}/api/simulate/recover`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setSimulationStatus(data);
      }
    } catch (err) {
      console.error("Closed-loop recovery trigger failed:", err);
    }
  };

  // Reset Simulation
  const handleResetSimulation = async () => {
    try {
      const res = await fetch(`${BACKEND_HTTP}/api/simulate/reset`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setSimulationStatus(data);
      }
    } catch (err) {
      console.error("Simulation reset failed:", err);
    }
  };

  // Export Blackbox Telemetry Downlink (.JSON / .CSV)
  const handleExportTelemetry = async (format: "json" | "csv") => {
    try {
      const url = `${BACKEND_HTTP}/api/telemetry/export?format=${format}&astronaut_id=${selectedAstronautId}`;
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        const nowStr = new Date().toISOString().replace(/[:.]/g, "-");
        a.download = `AstroPulse_Blackbox_${selectedAstronautId}_${nowStr}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        return;
      }
    } catch (e) {
      console.warn("Direct backend export failed, using local buffer fallback:", e);
    }

    // Client-side fallback export
    if (format === "json") {
      const jsonStr = JSON.stringify({
        source: "AstroPulse Client Blackbox Buffer",
        astronaut_id: selectedAstronautId,
        history: chartHistory,
        current_packet: telemetry
      }, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AstroPulse_OfflineLog_${selectedAstronautId}.json`;
      a.click();
    } else {
      const header = "timestamp,timeStr,heartRate,spo2,hrv,cabinCo2\n";
      const rows = chartHistory.map(p => `${p.timestamp},${p.timeStr},${p.heartRate},${p.spo2},${p.hrv},${p.cabinCo2}`).join("\n");
      const blob = new Blob([header + rows], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AstroPulse_OfflineLog_${selectedAstronautId}.csv`;
      a.click();
    }
  };

  return (
    <div className="min-h-screen bg-[#05080e] cockpit-grid text-slate-100 flex flex-col">
      {/* Top Cockpit Header */}
      <Header
        telemetry={telemetry}
        isConnected={isConnected}
        simulationStatus={simulationStatus}
        isAudioMuted={isAudioMuted}
        isAnalyticsViewActive={isAnalyticsViewActive}
        onToggleAnalyticsView={() => setIsAnalyticsViewActive(!isAnalyticsViewActive)}
        onToggleAudio={handleToggleAudio}
        onQuickToggleCrisis={handleQuickToggleCrisis}
        onOpenSimModal={() => setIsSimModalOpen(true)}
        onResetSimulation={handleResetSimulation}
        onOpenChecklist={() => setIsChecklistOpen(true)}
        onExportTelemetry={handleExportTelemetry}
      />

      {/* Main Mission Control Body */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 lg:p-8 flex flex-col gap-6">
        {/* Row 1: Crew Members Selector Bar */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Active Crew Manifest & Station Positions
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              SELECT CREW MEMBER TO LOAD PERSONALIZED HEMODYNAMIC ENVELOPE
            </span>
          </div>
          <CrewSelector
            crewList={crewOverview}
            selectedId={selectedAstronautId}
            onSelectAstronaut={handleSelectAstronaut}
          />
        </section>

        {/* Row 2: Anomaly Alert Banner ("Grandma Theory" Legibility) */}
        <section>
          <AnomalyAlertBanner
            overallStatus={telemetry?.overall_status || "NOMINAL"}
            anomalies={telemetry?.anomalies || []}
            mlConfidencePct={telemetry?.ml_confidence_pct}
            primaryVector={telemetry?.primary_contributing_vector}
            onOpenChecklist={() => setIsChecklistOpen(true)}
          />
        </section>

        {/* Row 3: 30-Day Long-Duration Microgravity Degradation Analytics (When Toggled) */}
        {isAnalyticsViewActive && (
          <section>
            <MicrogravityDegradationTracker
              currentMissionDay={telemetry?.mission_day || 42}
              astronautName={telemetry?.astronaut_name || "Sarah Vance"}
            />
          </section>
        )}

        {/* Row 4: High-Visibility Neon Gauges with Dynamic Personalized Thresholds */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Personalized Biometric Gauges & Hemodynamic Envelope ({telemetry?.astronaut_name || "Sarah Vance"})
            </span>
            <div className="flex items-center gap-3 font-mono text-[10px]">
              {telemetry?.hardware_sensor_linked && (
                <span className="text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
                  <Bluetooth className="w-3.5 h-3.5" />
                  PHYSICAL WEARABLE INGESTION ACTIVE ({telemetry.hardware_device_id || "BTLE-01"})
                </span>
              )}
              <span className="text-cyan-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                ISOLATION-FOREST EDGE ML ACTIVE
              </span>
            </div>
          </div>
          {telemetry ? (
            <MetricGauges 
              vitals={telemetry.vitals} 
              personalizedThresholds={telemetry.personalized_thresholds}
              astronautName={telemetry.astronaut_name}
            />
          ) : (
            <div className="p-8 text-center font-mono text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
              Streaming astronaut biometric array...
            </div>
          )}
        </section>

        {/* Row 5: Live Dynamic Waves Chart */}
        <section>
          <LiveVitalsChart data={chartHistory} />
        </section>

        {/* Row 6: Actionable Emergency Countermeasures Card */}
        <section>
          <CountermeasuresCard anomalies={telemetry?.anomalies || []} />
        </section>

        {/* Row 7: Flight Surgeon Mission Telemetry Footer */}
        <footer className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>AstroPulse Systems Level 3 Mission-Grade</span>
            <span>•</span>
            <span>NASA Space Apps Challenge 2026 Submission</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>1-Hour Rolling Blackbox Active</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Telemetry Downlink: AES-256-GCM (128 kbps)</span>
            </span>
            <span>•</span>
            <span className="text-slate-400">Houston Med-Ops Station Node 2</span>
          </div>
        </footer>
      </main>

      {/* Clinical Flight Medicine SOP Side-Drawer with Automated 15-Second Closed-Loop Recovery */}
      <ClinicalChecklistDrawer
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
        telemetry={telemetry}
        onResolveAnomaly={handleTriggerClosedLoopRecovery}
      />

      {/* Simulation Injector Modal */}
      <SimulationControlModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        currentMode={simulationStatus?.current_mode || "NORMAL"}
        onTriggerScenario={handleTriggerScenario}
        onReset={handleResetSimulation}
      />
    </div>
  );
}
