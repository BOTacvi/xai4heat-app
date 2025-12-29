/**
 * SCADA Page
 *
 * Displays temperature and pressure readings from SCADA system
 * - Lamela selection dropdown (extracts from location field)
 * - Current temperature and pressure cards
 * - Date range filtering
 * - Time-series graphs
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Select, SelectOption } from "@/components/fields/Select";
import { MetricCard } from "@/components/cards/MetricCard";
import {
  DateRangeFilter,
  DateRange,
} from "@/components/filters/DateRangeFilter";
import {
  TimeSeriesChart,
  TimeSeriesDataPoint,
} from "@/components/charts/TimeSeriesChart";
import { MetricCardSkeleton } from "@/components/skeletons/MetricCardSkeleton";
import { ChartSkeleton } from "@/components/skeletons/ChartSkeleton";
import { ConnectionBadge } from "@/components/realtime/ConnectionBadge";
import { useSCADARealtime } from "@/lib/hooks/useSCADARealtime";
import type { SCADAMeasurement as RealtimeSCADAMeasurement } from "@/lib/hooks/useSCADARealtime";

type ScadaMeasurement = {
  datetime: string;
  location: string;
  t_amb: number | null;
  t_ref: number | null;
  t_sup_prim: number | null;
  t_ret_prim: number | null;
  t_sup_sec: number | null;
  t_ret_sec: number | null;
  e: number | null;
  pe: number | null;
};

export default function ScadaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read selected lamela directly from URL params
  const selectedLamela = searchParams.get("lamela") || "";

  // Read date range from URL params (or use defaults) - memoized to prevent infinite loops
  const dateRange = useMemo((): DateRange => {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    // If URL has valid date params, use them
    if (fromParam && toParam) {
      try {
        const fromDate = new Date(fromParam);
        const toDate = new Date(toParam);

        // Validate dates
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          return {
            from: fromParam, // Use the param directly to avoid re-creating ISO strings
            to: toParam,
          };
        }
      } catch (error) {
        console.warn("Invalid date params in URL:", error);
      }
    }

    // Default: last 7 days
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return {
      from: weekAgo.toISOString(),
      to: now.toISOString(),
    };
  }, [searchParams]);

  const [lamelas, setLamelas] = useState<string[]>([]);
  const [measurements, setMeasurements] = useState<ScadaMeasurement[]>([]);
  const [isLoadingLamelas, setIsLoadingLamelas] = useState(true);
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(false);
  const [expectedTempMin, setExpectedTempMin] = useState<number>(18);
  const [expectedTempMax, setExpectedTempMax] = useState<number>(24);
  const [expectedPressureMin, setExpectedPressureMin] = useState<number>(0);
  const [expectedPressureMax, setExpectedPressureMax] = useState<number>(5);

  useEffect(() => {
    const fetchLamelas = async () => {
      try {
        const res = await fetch("/api/scada?limit=1000");
        const data = await res.json();

        if (data.measurements) {
          const lamelaIdentifiers = data.measurements
            .map((m: ScadaMeasurement) => {
              const match = m.location.match(/L\d+/);
              return match ? match[0] : null;
            })
            .filter((lamela: string | null) => lamela !== null);

          const uniqueLamelas = Array.from(
            new Set(lamelaIdentifiers)
          ) as string[];
          uniqueLamelas.sort((a, b) => {
            const numA = parseInt(a.substring(1));
            const numB = parseInt(b.substring(1));
            return numA - numB;
          });

          setLamelas(uniqueLamelas);
        }
      } catch (error) {
        console.error("Failed to fetch lamelas:", error);
      } finally {
        setIsLoadingLamelas(false);
      }
    };

    fetchLamelas();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/user/settings");
        const data = await res.json();

        if (data && data.expected_temp_min !== undefined) {
          setExpectedTempMin(data.expected_temp_min ?? 18);
          setExpectedTempMax(data.expected_temp_max ?? 24);
          setExpectedPressureMin(data.expected_pressure_min ?? 0);
          setExpectedPressureMax(data.expected_pressure_max ?? 5);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    if (!selectedLamela) return;

    const fetchMeasurements = async () => {
      setIsLoadingMeasurements(true);
      try {
        const params = new URLSearchParams({
          lamela: selectedLamela,
          from: dateRange.from,
          to: dateRange.to,
          limit: "1000",
        });

        const res = await fetch(`/api/scada?${params}`);
        const data = await res.json();
        setMeasurements(data.measurements || []);
      } catch (error) {
        console.error("Failed to fetch measurements:", error);
      } finally {
        setIsLoadingMeasurements(false);
      }
    };

    fetchMeasurements();
  }, [selectedLamela, dateRange]);

  // Handle new measurements from realtime - prepend to existing measurements
  const handleNewMeasurement = useCallback(
    (newMeasurement: RealtimeSCADAMeasurement) => {
      setMeasurements((prev) => {
        // Prepend new measurement
        const updated = [newMeasurement, ...prev];

        // Limit array size to prevent memory issues (keep last 500)
        return updated.slice(0, 500);
      });
    },
    []
  );

  // Subscribe to realtime updates
  const { isConnected } = useSCADARealtime({
    lamela: selectedLamela,
    onNewMeasurement: handleNewMeasurement,
    enabled: !!selectedLamela, // Only subscribe when lamela selected
  });

  // Handle lamela selection change - write directly to URL, preserve date range
  const handleLamelaChange = (newLamela: string) => {
    const params = new URLSearchParams();

    if (newLamela) {
      params.set("lamela", newLamela);
    }

    // Always preserve date range in URL
    params.set("from", dateRange.from);
    params.set("to", dateRange.to);

    const newURL = `/dashboard/scada?${params.toString()}`;
    router.push(newURL);
  };

  // Handle date range change - write directly to URL, preserve lamela
  const handleDateRangeChange = (newDateRange: DateRange) => {
    const params = new URLSearchParams();

    if (selectedLamela) {
      params.set("lamela", selectedLamela);
    }

    // Update with new date range
    params.set("from", newDateRange.from);
    params.set("to", newDateRange.to);

    const newURL = `/dashboard/scada?${params.toString()}`;
    router.push(newURL);
  };

  const lamelaOptions: SelectOption[] = lamelas.map((lamela) => ({
    label: lamela,
    value: lamela,
  }));

  const currentTemp = measurements.length > 0 ? measurements[0].t_amb : null;
  const currentPressure = measurements.length > 0 ? measurements[0].e : null;
  const currentTSupPrim = measurements.length > 0 ? measurements[0].t_sup_prim : null;
  const currentTRetPrim = measurements.length > 0 ? measurements[0].t_ret_prim : null;
  const currentTSupSec = measurements.length > 0 ? measurements[0].t_sup_sec : null;
  const currentTRetSec = measurements.length > 0 ? measurements[0].t_ret_sec : null;
  const latestTimestamp =
    measurements.length > 0 ? measurements[0].datetime : undefined;

  // Calculate temperature statistics
  const tempStats = useMemo(() => {
    const temps = measurements
      .filter((m) => m.t_amb !== null)
      .map((m) => m.t_amb!);

    if (temps.length === 0) return null;

    const sum = temps.reduce((a, b) => a + b, 0);
    const avg = sum / temps.length;
    const min = Math.min(...temps);
    const max = Math.max(...temps);

    return { avg, min, max };
  }, [measurements]);

  // Calculate pressure statistics
  const pressureStats = useMemo(() => {
    const pressures = measurements.filter((m) => m.e !== null).map((m) => m.e!);

    if (pressures.length === 0) return null;

    const sum = pressures.reduce((a, b) => a + b, 0);
    const avg = sum / pressures.length;
    const min = Math.min(...pressures);
    const max = Math.max(...pressures);

    return { avg, min, max };
  }, [measurements]);

  const tempChartData: TimeSeriesDataPoint[] = measurements
    .filter((m) => m.t_amb !== null)
    .map((m) => ({ timestamp: m.datetime, value: m.t_amb! }))
    .reverse();

  const pressureChartData: TimeSeriesDataPoint[] = measurements
    .filter((m) => m.e !== null)
    .map((m) => ({ timestamp: m.datetime, value: m.e! }))
    .reverse();

  return (
    <div className="page-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h1 className="page-title" style={{ margin: 0 }}>
          SCADA Monitoring
        </h1>
        {selectedLamela && <ConnectionBadge isConnected={isConnected} />}
      </div>

      {/* Lamela Selection and Date Range in same row */}
      <div className="content-grid">
        <div className="grid-item">
          <div className="card-container">
            {isLoadingLamelas ? (
              <div className="loading-text">Loading lamelas...</div>
            ) : (
              <Select
                label="Select Lamela"
                options={lamelaOptions}
                value={selectedLamela}
                onChange={(value) => handleLamelaChange(String(value))}
                placeholder="Choose a lamela"
                fullWidth
              />
            )}
          </div>
        </div>

        {selectedLamela && (
          <div className="grid-item">
            <DateRangeFilter
              value={dateRange}
              onChange={handleDateRangeChange}
            />
          </div>
        )}
      </div>

      {selectedLamela && (
        <div className="content-grid">
          {/* Temperature Card with Stats */}
          <div className="grid-item">
            {isLoadingMeasurements ? (
              <MetricCardSkeleton />
            ) : (
              <div className="card-container">
                <h3 style={{ marginTop: 0 }}>Temperature</h3>
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                    {currentTemp !== null ? `${currentTemp.toFixed(1)}°C` : "—"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Current
                  </div>
                </div>
                {tempStats && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "1rem",
                      paddingTop: "1rem",
                      borderTop: "1px solid var(--border-color)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "600",
                          color: "#10b981",
                        }}
                      >
                        {tempStats.avg.toFixed(1)}°C
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Average
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "600",
                          color: "#3b82f6",
                        }}
                      >
                        {tempStats.min.toFixed(1)}°C
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Minimum
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "600",
                          color: "#ef4444",
                        }}
                      >
                        {tempStats.max.toFixed(1)}°C
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Maximum
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pressure Card with Stats */}
          <div className="grid-item">
            {isLoadingMeasurements ? (
              <MetricCardSkeleton />
            ) : (
              <div className="card-container">
                <h3 style={{ marginTop: 0 }}>Pressure</h3>
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                    {currentPressure !== null
                      ? `${currentPressure.toFixed(1)} bar`
                      : "—"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Current
                  </div>
                </div>
                {pressureStats && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "1rem",
                      paddingTop: "1rem",
                      borderTop: "1px solid var(--border-color)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "600",
                          color: "#10b981",
                        }}
                      >
                        {pressureStats.avg.toFixed(1)} bar
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Average
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "600",
                          color: "#3b82f6",
                        }}
                      >
                        {pressureStats.min.toFixed(1)} bar
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Minimum
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "600",
                          color: "#ef4444",
                        }}
                      >
                        {pressureStats.max.toFixed(1)} bar
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Maximum
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Primary Circuit - Supply Temperature */}
          <div className="grid-item">
            {isLoadingMeasurements ? (
              <MetricCardSkeleton />
            ) : (
              <div className="card-container">
                <h3 style={{ marginTop: 0 }}>Primary Supply Temp</h3>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                  From District Heating → Building
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                    {currentTSupPrim !== null ? `${currentTSupPrim.toFixed(1)}°C` : "—"}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    Current
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Primary Circuit - Return Temperature */}
          <div className="grid-item">
            {isLoadingMeasurements ? (
              <MetricCardSkeleton />
            ) : (
              <div className="card-container">
                <h3 style={{ marginTop: 0 }}>Primary Return Temp</h3>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                  From Building → District Heating
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                    {currentTRetPrim !== null ? `${currentTRetPrim.toFixed(1)}°C` : "—"}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    Current
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Secondary Circuit - Supply Temperature */}
          <div className="grid-item">
            {isLoadingMeasurements ? (
              <MetricCardSkeleton />
            ) : (
              <div className="card-container">
                <h3 style={{ marginTop: 0 }}>Secondary Supply Temp</h3>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                  To Radiators/Floors in Building
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                    {currentTSupSec !== null ? `${currentTSupSec.toFixed(1)}°C` : "—"}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    Current
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Secondary Circuit - Return Temperature */}
          <div className="grid-item">
            {isLoadingMeasurements ? (
              <MetricCardSkeleton />
            ) : (
              <div className="card-container">
                <h3 style={{ marginTop: 0 }}>Secondary Return Temp</h3>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                  From Radiators/Floors in Building
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
                    {currentTRetSec !== null ? `${currentTRetSec.toFixed(1)}°C` : "—"}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    Current
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid-item-full-width">
            {isLoadingMeasurements ? (
              <ChartSkeleton />
            ) : (
              <TimeSeriesChart
                data={tempChartData}
                title="Ambient Temperature Over Time"
                yAxisLabel="Temperature (°C)"
              />
            )}
          </div>

          <div className="grid-item-full-width">
            {isLoadingMeasurements ? (
              <ChartSkeleton />
            ) : (
              <TimeSeriesChart
                data={pressureChartData}
                title="Pressure Over Time"
                yAxisLabel="Pressure (bar)"
                yAxisDomain={[18660, 18670]}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
