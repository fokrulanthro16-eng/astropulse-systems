"use client";

import React from "react";
import { 
  Heart, 
  Activity, 
  Wind, 
  Thermometer, 
  Gauge, 
  CloudRain, 
  Sparkles, 
  ShieldAlert,
  UserCheck
} from "lucide-react";
import { AstronautVitals } from "@/lib/types";

interface MetricGaugesProps {
  vitals: AstronautVitals;
  personalizedThresholds?: Record<string, any>;
  astronautName?: string;
}

interface GaugeConfig {
  id: string;
  label: string;
  value: number | string;
  unit: string;
  nominalRange: string;
  icon: React.ReactNode;
  severity: "nominal" | "caution" | "critical";
  statusText: string;
  percent: number;
  profileBadge?: string;
}

export const MetricGauges: React.FC<MetricGaugesProps> = ({ 
  vitals, 
  personalizedThresholds = {},
  astronautName
}) => {
  // Personalized Dynamic Thresholds
  const hrNomMin = personalizedThresholds.hr_nominal_min ?? 55.0;
  const hrNomMax = personalizedThresholds.hr_nominal_max ?? 85.0;
  const hrWarnLow = personalizedThresholds.hr_warning_low ?? 48.0;
  const hrWarnHigh = personalizedThresholds.hr_warning_high ?? 100.0;
  const hrCritLow = personalizedThresholds.hr_critical_low ?? 40.0;
  const hrCritHigh = personalizedThresholds.hr_critical_high ?? 130.0;
  const hrvWarnLow = personalizedThresholds.hrv_warning_low ?? 28.0;
  const hrvCritLow = personalizedThresholds.hrv_critical_low ?? 20.0;
  const profileType = personalizedThresholds.profile_type;

  // 1. Heart Rate (with personalized tolerance for athletic bradycardia)
  let hrSeverity: "nominal" | "caution" | "critical" = "nominal";
  let hrStatus = "STABLE RHYTHM";
  if (vitals.heart_rate >= hrCritHigh || vitals.heart_rate <= hrCritLow) {
    hrSeverity = "critical";
    hrStatus = vitals.heart_rate >= hrCritHigh ? "SEVERE TACHYCARDIA" : "SEVERE BRADYCARDIA";
  } else if (vitals.heart_rate >= hrWarnHigh || vitals.heart_rate <= hrWarnLow) {
    hrSeverity = "caution";
    hrStatus = vitals.heart_rate >= hrWarnHigh ? "ELEVATED HEART RATE" : "RESTING BRADYCARDIA";
  }
  const hrPercent = Math.min(100, Math.max(0, ((vitals.heart_rate - 35) / (155 - 35)) * 100));

  // 2. SpO2
  let spo2Severity: "nominal" | "caution" | "critical" = "nominal";
  let spo2Status = "OPTIMAL O2 SAT";
  if (vitals.spo2 <= 88.0) {
    spo2Severity = "critical";
    spo2Status = "CRITICAL HYPOXIA";
  } else if (vitals.spo2 <= 92.5) {
    spo2Severity = "caution";
    spo2Status = "DESATURATION WARNING";
  }
  const spo2Percent = Math.min(100, Math.max(0, ((vitals.spo2 - 70) / (100 - 70)) * 100));

  // 3. HRV RMSSD (Personalized vagal tone threshold)
  let hrvSeverity: "nominal" | "caution" | "critical" = "nominal";
  let hrvStatus = "VAGAL TONE ROBUST";
  if (vitals.hrv_rmssd <= hrvCritLow) {
    hrvSeverity = "critical";
    hrStatus = "DECONDITIONING CRITICAL";
  } else if (vitals.hrv_rmssd <= hrvWarnLow) {
    hrvSeverity = "caution";
    hrStatus = "AUTONOMIC STRESS";
  }
  const hrvPercent = Math.min(100, Math.max(0, (vitals.hrv_rmssd / 85) * 100));

  // 4. Cabin CO2
  let co2Severity: "nominal" | "caution" | "critical" = "nominal";
  let co2Status = "AIR SCRUBBER NOMINAL";
  if (vitals.cabin_co2 >= 3200) {
    co2Severity = "critical";
    co2Status = "HYPERCAPNIC TOXICITY";
  } else if (vitals.cabin_co2 >= 1600) {
    co2Severity = "caution";
    co2Status = "ELEVATED CO2 DRIFT";
  }
  const co2Percent = Math.min(100, Math.max(0, (vitals.cabin_co2 / 5000) * 100));

  // 5. Core Body Temperature
  let tempSeverity: "nominal" | "caution" | "critical" = "nominal";
  let tempStatus = "NORMOTHERMIC";
  if (vitals.core_temp >= 38.4 || vitals.core_temp <= 35.0) {
    tempSeverity = "critical";
    tempStatus = vitals.core_temp >= 38.4 ? "HYPERTHERMIC DANGER" : "HYPOTHERMIA DANGER";
  } else if (vitals.core_temp >= 37.7 || vitals.core_temp <= 35.8) {
    tempSeverity = "caution";
    tempStatus = "THERMAL ELEVATION";
  }
  const tempPercent = Math.min(100, Math.max(0, ((vitals.core_temp - 34) / (41 - 34)) * 100));

  // 6. Respiration Rate
  let respSeverity: "nominal" | "caution" | "critical" = "nominal";
  let respStatus = "EUPNEIC BREATHING";
  if (vitals.respiration_rate >= 25 || vitals.respiration_rate <= 8) {
    respSeverity = "critical";
    respStatus = "TACHYPNEA EMERGENCY";
  } else if (vitals.respiration_rate >= 20 || vitals.respiration_rate <= 10) {
    respSeverity = "caution";
    respStatus = "RESPIRATORY WORKLOAD";
  }
  const respPercent = Math.min(100, Math.max(0, (vitals.respiration_rate / 35) * 100));

  const gauges: GaugeConfig[] = [
    {
      id: "heart_rate",
      label: "HEART RATE",
      value: Math.round(vitals.heart_rate),
      unit: "BPM",
      nominalRange: `${hrNomMin.toFixed(0)} - ${hrNomMax.toFixed(0)} bpm`,
      icon: <Heart className={`w-5 h-5 ${hrSeverity === "critical" ? "animate-ping text-red-400" : "text-rose-400"}`} />,
      severity: hrSeverity,
      statusText: hrStatus,
      percent: hrPercent,
      profileBadge: profileType,
    },
    {
      id: "spo2",
      label: "BLOOD OXYGEN (SpO₂)",
      value: vitals.spo2.toFixed(1),
      unit: "%",
      nominalRange: "95 - 100 %",
      icon: <Activity className="w-5 h-5 text-cyan-400" />,
      severity: spo2Severity,
      statusText: spo2Status,
      percent: spo2Percent,
    },
    {
      id: "hrv_rmssd",
      label: "HRV RMSSD",
      value: vitals.hrv_rmssd.toFixed(1),
      unit: "MS",
      nominalRange: `${hrvWarnLow.toFixed(0)} - 80 ms`,
      icon: <Sparkles className="w-5 h-5 text-indigo-400" />,
      severity: hrvSeverity,
      statusText: hrvStatus,
      percent: hrvPercent,
    },
    {
      id: "cabin_co2",
      label: "CABIN CO₂",
      value: Math.round(vitals.cabin_co2),
      unit: "PPM",
      nominalRange: "400 - 1,000 ppm",
      icon: <CloudRain className="w-5 h-5 text-emerald-400" />,
      severity: co2Severity,
      statusText: co2Status,
      percent: co2Percent,
    },
    {
      id: "core_temp",
      label: "CORE TEMPERATURE",
      value: vitals.core_temp.toFixed(2),
      unit: "°C",
      nominalRange: "36.5 - 37.4 °C",
      icon: <Thermometer className="w-5 h-5 text-amber-400" />,
      severity: tempSeverity,
      statusText: tempStatus,
      percent: tempPercent,
    },
    {
      id: "respiration_rate",
      label: "RESPIRATION RATE",
      value: Math.round(vitals.respiration_rate),
      unit: "BR/MIN",
      nominalRange: "12 - 18 br/min",
      icon: <Wind className="w-5 h-5 text-sky-400" />,
      severity: respSeverity,
      statusText: respStatus,
      percent: respPercent,
    },
    {
      id: "blood_pressure",
      label: "BLOOD PRESSURE",
      value: `${Math.round(vitals.systolic_bp)}/${Math.round(vitals.diastolic_bp)}`,
      unit: "MMHG",
      nominalRange: "115/75 mmHg",
      icon: <Gauge className="w-5 h-5 text-violet-400" />,
      severity: vitals.systolic_bp >= 140 || vitals.systolic_bp <= 90 ? "caution" : "nominal",
      statusText: vitals.systolic_bp >= 140 ? "HYPERTENSIVE" : "MICRO-G STABLE",
      percent: 60,
    },
    {
      id: "suit_pressure",
      label: "SUIT INTEGRITY",
      value: vitals.suit_pressure_psi.toFixed(2),
      unit: "PSI",
      nominalRange: "4.25 - 4.35 psi",
      icon: <ShieldAlert className="w-5 h-5 text-teal-400" />,
      severity: vitals.suit_pressure_psi < 3.8 ? "critical" : "nominal",
      statusText: vitals.suit_pressure_psi < 3.8 ? "DECOMPRESSION DANGER" : "SEAL INTEGRITY 100%",
      percent: 85,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {gauges.map((g) => {
        let cardBorder = "border-slate-800 bg-[#090e1a]/80";
        let glowClass = "";
        let valColor = "text-emerald-300";
        let barColor = "bg-emerald-500";
        let badgeBg = "bg-emerald-950/80 text-emerald-400 border-emerald-800/80";

        if (g.severity === "critical") {
          cardBorder = "border-red-500 bg-red-950/30";
          glowClass = "glow-crimson animate-pulse";
          valColor = "text-red-400";
          barColor = "bg-red-500";
          badgeBg = "bg-red-900 text-red-200 border-red-500 animate-alert-fast";
        } else if (g.severity === "caution") {
          cardBorder = "border-amber-500 bg-amber-950/25";
          glowClass = "glow-amber";
          valColor = "text-amber-300";
          barColor = "bg-amber-500";
          badgeBg = "bg-amber-900 text-amber-200 border-amber-500";
        }

        return (
          <div
            key={g.id}
            className={`p-4 rounded-xl border backdrop-blur transition-all flex flex-col justify-between relative overflow-hidden ${cardBorder} ${glowClass}`}
          >
            {/* Top row: Label, Profile Badge & Icon */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex flex-col">
                <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                  {g.label}
                </span>
                {g.profileBadge && (
                  <span className="text-[9px] font-mono text-cyan-400 font-semibold tracking-wide">
                    {g.profileBadge}
                  </span>
                )}
              </div>
              <div className="p-1.5 rounded-lg bg-black/40 border border-slate-800 flex-shrink-0">
                {g.icon}
              </div>
            </div>

            {/* Middle: Giant High-Visibility Tabular Numeral */}
            <div className="my-3 flex items-baseline gap-2">
              <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight tabular-nums ${valColor}`}>
                {g.value}
              </span>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                {g.unit}
              </span>
            </div>

            {/* Bottom: Progress Bar Gauge */}
            <div className="space-y-2">
              <div className="w-full bg-slate-900/90 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-700 ease-out ${barColor}`}
                  style={{ width: `${Math.max(5, Math.min(100, g.percent))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className={`px-2 py-0.5 rounded border font-bold ${badgeBg}`}>
                  {g.statusText}
                </span>
                <span className="text-slate-500 font-medium">
                  {g.nominalRange}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
