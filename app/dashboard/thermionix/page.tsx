/**
 * Thermionix Page
 *
 * Displays temperature and humidity readings from Thermionix sensors
 * - Apartment selection dropdown
 * - Current temperature and humidity cards
 * - Date range filtering
 * - Time-series graphs
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Select, SelectOption } from "@/components/fields/Select";
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
import { ExportButton } from "@/components/atoms/ExportButton";
import { useThermionixRealtime } from "@/lib/hooks/useThermionixRealtime";
import { exportThermionixData } from "@/lib/exports/thermionixExport";
import type { ThermionixMeasurement as RealtimeThermionixMeasurement } from "@/lib/hooks/useThermionixRealtime";
import styles from "./page.module.css";

type Device = {
  device_id: string;
  name: string;
  location: string;
};

type ThermionixMeasurement = {
  datetime: string;
  device_id: number;
  probe_id: number;
  temperature: number | null;
  relative_humidity: number | null;
  co2: number | null;
};

export default function ThermionixPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read selected apartment directly from URL params
  const selectedDeviceId = searchParams.get("apartment") || "";

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

  // State
  const [devices, setDevices] = useState<Device[]>([]);
  const [measurements, setMeasurements] = useState<ThermionixMeasurement[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(false);
  const [expectedTempMin, setExpectedTempMin] = useState<number>(18);
  const [expectedTempMax, setExpectedTempMax] = useState<number>(26);
  const [expectedHumidityMin, setExpectedHumidityMin] = useState<number>(30);
  const [expectedHumidityMax, setExpectedHumidityMax] = useState<number>(70);
  const [expectedCO2Min, setExpectedCO2Min] = useState<number>(400);
  const [expectedCO2Max, setExpectedCO2Max] = useState<number>(1000);

  // Fetch devices on mount
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch("/api/devices");
        const data = await res.json();

        setDevices(data || []);
      } catch (error) {
        console.error("Failed to fetch devices:", error);
      } finally {
        setIsLoadingDevices(false);
      }
    };

    fetchDevices();
  }, []);

  // Fetch user settings for expected ranges
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/user/settings");
        const data = await res.json();
        // API returns settings directly, not nested under data.settings
        // Values are always present in DB (Prisma schema defaults ensure this)
        if (data && !data.error) {
          setExpectedTempMin(data.expected_temp_min);
          setExpectedTempMax(data.expected_temp_max);
          setExpectedHumidityMin(data.expected_humidity_min);
          setExpectedHumidityMax(data.expected_humidity_max);
          setExpectedCO2Min(data.expected_co2_min);
          setExpectedCO2Max(data.expected_co2_max);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };

    fetchSettings();
  }, []);

  // Fetch measurements when device or date range changes
  useEffect(() => {
    if (!selectedDeviceId) return;

    const fetchMeasurements = async () => {
      setIsLoadingMeasurements(true);
      try {
        const params = new URLSearchParams({
          device_id: selectedDeviceId,
          from: dateRange.from,
          to: dateRange.to,
          limit: "1000",
        });

        const res = await fetch(`/api/thermionix?${params}`);
        const data = await res.json();
        setMeasurements(data.measurements || []);
      } catch (error) {
        console.error("Failed to fetch measurements:", error);
      } finally {
        setIsLoadingMeasurements(false);
      }
    };

    fetchMeasurements();
  }, [selectedDeviceId, dateRange]);

  // Handle new measurements from realtime - prepend to existing measurements
  const handleNewMeasurement = useCallback(
    (newMeasurement: RealtimeThermionixMeasurement) => {
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
  const { isConnected } = useThermionixRealtime({
    deviceId: selectedDeviceId,
    onNewMeasurement: handleNewMeasurement,
    enabled: !!selectedDeviceId, // Only subscribe when device selected
  });

  // Handle apartment selection change - write directly to URL, preserve date range
  const handleDeviceChange = (newDeviceId: string) => {
    const params = new URLSearchParams();

    if (newDeviceId) {
      params.set("apartment", newDeviceId);
    }

    // Always preserve date range in URL
    params.set("from", dateRange.from);
    params.set("to", dateRange.to);

    const newURL = `/dashboard/thermionix?${params.toString()}`;
    router.push(newURL);
  };

  // Handle date range change - write directly to URL, preserve apartment
  const handleDateRangeChange = (newDateRange: DateRange) => {
    const params = new URLSearchParams();

    if (selectedDeviceId) {
      params.set("apartment", selectedDeviceId);
    }

    // Update with new date range
    params.set("from", newDateRange.from);
    params.set("to", newDateRange.to);

    const newURL = `/dashboard/thermionix?${params.toString()}`;
    router.push(newURL);
  };

  // Prepare device options for select
  const deviceOptions: SelectOption[] = devices
    .filter((device) => !device.name.includes("CO2")) // Filter out CO2 devices
    .sort((a, b) => {
      // Sort by lamela, then building, then apartment
      const partsA = a.name.split("_");
      const partsB = b.name.split("_");

      if (partsA.length >= 3 && partsB.length >= 3) {
        // Extract and convert to numbers for proper sorting
        const lamelaA = parseInt(partsA[0].replace("L", "")) || 0;
        const lamelaB = parseInt(partsB[0].replace("L", "")) || 0;
        const buildingA = parseInt(partsA[1]) || 0;
        const buildingB = parseInt(partsB[1]) || 0;
        const apartmentA = parseInt(partsA[2]) || 0;
        const apartmentB = parseInt(partsB[2]) || 0;

        // Compare lamela first
        if (lamelaA !== lamelaB) return lamelaA - lamelaB;
        // Then building
        if (buildingA !== buildingB) return buildingA - buildingB;
        // Finally apartment
        return apartmentA - apartmentB;
      }

      // Fallback to string comparison
      return a.name.localeCompare(b.name);
    })
    .map((device) => {
      // Extract lamela, building, and apartment numbers from device name
      // Example: "L8_33_67" -> lamela: "8", building: "33", apartment: "67"
      const parts = device.name.split("_");

      if (parts.length >= 3) {
        const lamela = parts[0].replace("L", ""); // Remove 'L' prefix from lamela
        const building = parts[1];
        const apartment = parts[2];

        return {
          label: `Apartment: ${lamela}/${building}/${apartment}`,
          value: device.device_id,
        };
      }

      // Fallback if format doesn't match expected pattern
      return {
        label: `Apartment: ${device.name}`,
        value: device.device_id,
      };
    });

  // Get current values (latest measurement)
  const currentTemp =
    measurements.length > 0 ? measurements[0].temperature : null;
  const currentHumidity =
    measurements.length > 0 ? measurements[0].relative_humidity : null;
  const currentCO2 =
    measurements.length > 0 ? measurements[0].co2 : null;

  // Get selected device name for export
  const selectedDevice = devices.find((d) => d.device_id === selectedDeviceId);
  const selectedDeviceName = selectedDevice?.name || selectedDeviceId;

  // Helper function to get color and status based on expected range
  const getValueStatus = (
    value: number | null,
    min: number,
    max: number
  ): { color: string; text: string } => {
    if (value === null) return { color: "inherit", text: "" };

    if (value < min) {
      return { color: "#3b82f6", text: "Below Expected" }; // Blue
    } else if (value > max) {
      return { color: "#ef4444", text: "Above Expected" }; // Red
    } else {
      return { color: "#10b981", text: "" }; // Green - within range, no text needed
    }
  };

  // Helper function to get just the color (for stats without text)
  const getValueColor = (value: number | null, min: number, max: number): string => {
    if (value === null) return "inherit";
    if (value < min) return "#3b82f6"; // Blue
    if (value > max) return "#ef4444"; // Red
    return "#10b981"; // Green
  };

  const tempStatus = getValueStatus(currentTemp, expectedTempMin, expectedTempMax);
  const humidityStatus = getValueStatus(currentHumidity, expectedHumidityMin, expectedHumidityMax);
  const co2Status = getValueStatus(currentCO2, expectedCO2Min, expectedCO2Max);

  // Calculate temperature statistics
  const tempStats = useMemo(() => {
    const temps = measurements
      .filter((m) => m.temperature !== null)
      .map((m) => m.temperature!);

    if (temps.length === 0) return null;

    const sum = temps.reduce((a, b) => a + b, 0);
    const avg = sum / temps.length;
    const min = Math.min(...temps);
    const max = Math.max(...temps);

    return { avg, min, max };
  }, [measurements]);

  // Calculate humidity statistics
  const humidityStats = useMemo(() => {
    const humidities = measurements
      .filter((m) => m.relative_humidity !== null)
      .map((m) => m.relative_humidity!);

    if (humidities.length === 0) return null;

    const sum = humidities.reduce((a, b) => a + b, 0);
    const avg = sum / humidities.length;
    const min = Math.min(...humidities);
    const max = Math.max(...humidities);

    return { avg, min, max };
  }, [measurements]);

  // Calculate CO2 statistics
  const co2Stats = useMemo(() => {
    const co2Values = measurements
      .filter((m) => m.co2 !== null)
      .map((m) => m.co2!);

    if (co2Values.length === 0) return null;

    const sum = co2Values.reduce((a, b) => a + b, 0);
    const avg = sum / co2Values.length;
    const min = Math.min(...co2Values);
    const max = Math.max(...co2Values);

    return { avg, min, max };
  }, [measurements]);

  // Handle export to Excel
  const handleExport = useCallback(() => {
    if (measurements.length === 0) return;

    exportThermionixData(
      measurements,
      selectedDeviceName,
      dateRange,
      {
        temperature: tempStats,
        humidity: humidityStats,
        co2: co2Stats,
      }
    );
  }, [measurements, selectedDeviceName, dateRange, tempStats, humidityStats, co2Stats]);

  // Prepare chart data
  const tempChartData: TimeSeriesDataPoint[] = measurements
    .filter((m) => m.temperature !== null)
    .map((m) => ({
      timestamp: m.datetime,
      value: m.temperature!,
    }))
    .reverse(); // Reverse to show oldest first

  const humidityChartData: TimeSeriesDataPoint[] = measurements
    .filter((m) => m.relative_humidity !== null)
    .map((m) => ({
      timestamp: m.datetime,
      value: m.relative_humidity!,
    }))
    .reverse();

  const co2ChartData: TimeSeriesDataPoint[] = measurements
    .filter((m) => m.co2 !== null)
    .map((m) => ({
      timestamp: m.datetime,
      value: m.co2!,
    }))
    .reverse();

  console.log({ deviceOptions, selectedDeviceId, devices });

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
          Thermionix Monitoring
        </h1>
        <div className={styles.headerActions}>
          {selectedDeviceId && measurements.length > 0 && (
            <ExportButton
              onExport={handleExport}
              label="Export"
              disabled={isLoadingMeasurements}
            />
          )}
          {selectedDeviceId && <ConnectionBadge isConnected={isConnected} />}
        </div>
      </div>

      {/* Apartment Selection and Date Range in same row */}
      <div className="content-grid">
        <div className="grid-item">
          <div className="card-container">
            {isLoadingDevices ? (
              <div className="loading-text">Loading apartments...</div>
            ) : (
              <Select
                label="Select Apartment"
                options={deviceOptions}
                value={selectedDeviceId}
                onChange={(value) => handleDeviceChange(String(value))}
                placeholder="Choose an apartment"
                fullWidth
              />
            )}
          </div>
        </div>

        {selectedDeviceId && (
          <div className="grid-item">
            <DateRangeFilter
              value={dateRange}
              onChange={handleDateRangeChange}
            />
          </div>
        )}
      </div>

      {selectedDeviceId && (
        <div className="content-grid">
          {/* Temperature Card with Stats - Full Width */}
          <div className="grid-item-full-width">
            {isLoadingMeasurements ? (
              <MetricCardSkeleton />
            ) : (
              <div className="card-container" style={{ position: "relative", paddingBottom: "3rem" }}>
                <h3 style={{ marginTop: 0, marginBottom: "1.5rem", fontWeight: "bold" }}>Temperature</h3>
                <div style={{ position: "absolute", bottom: "1rem", left: "1rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Expected: {expectedTempMin}°C - {expectedTempMax}°C
                </div>
                <div className={styles.statsContainer}>
                  <div className={`${styles.statItem} ${styles.currentStat}`}>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", color: tempStatus.color }}>
                      {currentTemp !== null ? `${currentTemp.toFixed(1)}°C` : "—"}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      Current
                    </div>
                    {tempStatus.text && (
                      <div style={{ fontSize: "0.75rem", color: tempStatus.color, marginTop: "0.25rem" }}>
                        {tempStatus.text}
                      </div>
                    )}
                  </div>
                  <div className={`${styles.statDivider} ${styles.currentDivider}`}></div>
                  {tempStats && (
                    <div className={styles.statsSecondary}>
                      <div className={styles.statItem}>
                        <div style={{ fontSize: "1.25rem", fontWeight: "600", color: getValueColor(tempStats.avg, expectedTempMin, expectedTempMax) }}>
                          {tempStats.avg.toFixed(1)}°C
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Average
                        </div>
                      </div>
                      <div className={styles.statDivider}></div>
                      <div className={styles.statItem}>
                        <div style={{ fontSize: "1.25rem", fontWeight: "600", color: getValueColor(tempStats.min, expectedTempMin, expectedTempMax) }}>
                          {tempStats.min.toFixed(1)}°C
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Minimum
                        </div>
                      </div>
                      <div className={styles.statDivider}></div>
                      <div className={styles.statItem}>
                        <div style={{ fontSize: "1.25rem", fontWeight: "600", color: getValueColor(tempStats.max, expectedTempMin, expectedTempMax) }}>
                          {tempStats.max.toFixed(1)}°C
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Maximum
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Temperature Chart - Full Width */}
          <div className="grid-item-full-width">
            {isLoadingMeasurements ? (
              <ChartSkeleton />
            ) : (
              <TimeSeriesChart
                data={tempChartData}
                title="Temperature Over Time"
                yAxisLabel="Temperature (°C)"
              />
            )}
          </div>

          {/* Humidity Card with Stats - Full Width */}
          <div className="grid-item-full-width">
            {isLoadingMeasurements ? (
              <MetricCardSkeleton />
            ) : (
              <div className="card-container" style={{ position: "relative", paddingBottom: "3rem" }}>
                <h3 style={{ marginTop: 0, marginBottom: "1.5rem", fontWeight: "bold" }}>Humidity</h3>
                <div style={{ position: "absolute", bottom: "1rem", left: "1rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Expected: {expectedHumidityMin}% - {expectedHumidityMax}%
                </div>
                <div className={styles.statsContainer}>
                  <div className={`${styles.statItem} ${styles.currentStat}`}>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", color: humidityStatus.color }}>
                      {currentHumidity !== null ? `${currentHumidity.toFixed(1)}%` : "—"}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      Current
                    </div>
                    {humidityStatus.text && (
                      <div style={{ fontSize: "0.75rem", color: humidityStatus.color, marginTop: "0.25rem" }}>
                        {humidityStatus.text}
                      </div>
                    )}
                  </div>
                  <div className={`${styles.statDivider} ${styles.currentDivider}`}></div>
                  {humidityStats && (
                    <div className={styles.statsSecondary}>
                      <div className={styles.statItem}>
                        <div style={{ fontSize: "1.25rem", fontWeight: "600", color: getValueColor(humidityStats.avg, expectedHumidityMin, expectedHumidityMax) }}>
                          {humidityStats.avg.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Average
                        </div>
                      </div>
                      <div className={styles.statDivider}></div>
                      <div className={styles.statItem}>
                        <div style={{ fontSize: "1.25rem", fontWeight: "600", color: getValueColor(humidityStats.min, expectedHumidityMin, expectedHumidityMax) }}>
                          {humidityStats.min.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Minimum
                        </div>
                      </div>
                      <div className={styles.statDivider}></div>
                      <div className={styles.statItem}>
                        <div style={{ fontSize: "1.25rem", fontWeight: "600", color: getValueColor(humidityStats.max, expectedHumidityMin, expectedHumidityMax) }}>
                          {humidityStats.max.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Maximum
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Humidity Chart - Full Width */}
          <div className="grid-item-full-width">
            {isLoadingMeasurements ? (
              <ChartSkeleton />
            ) : (
              <TimeSeriesChart
                data={humidityChartData}
                title="Relative Humidity Over Time"
                yAxisLabel="Humidity (%)"
              />
            )}
          </div>

          {/* CO2 Card with Stats - Full Width */}
          <div className="grid-item-full-width">
            {isLoadingMeasurements ? (
              <MetricCardSkeleton />
            ) : (
              <div className="card-container" style={{ position: "relative", paddingBottom: "3rem" }}>
                <h3 style={{ marginTop: 0, marginBottom: "1.5rem", fontWeight: "bold" }}>CO2</h3>
                <div style={{ position: "absolute", bottom: "1rem", left: "1rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Expected: {expectedCO2Min} - {expectedCO2Max} ppm
                </div>
                <div className={styles.statsContainer}>
                  <div className={`${styles.statItem} ${styles.currentStat}`}>
                    <div style={{ fontSize: "2rem", fontWeight: "bold", color: co2Status.color }}>
                      {currentCO2 !== null ? `${currentCO2.toFixed(0)} ppm` : "—"}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      Current
                    </div>
                    {co2Status.text && (
                      <div style={{ fontSize: "0.75rem", color: co2Status.color, marginTop: "0.25rem" }}>
                        {co2Status.text}
                      </div>
                    )}
                  </div>
                  <div className={`${styles.statDivider} ${styles.currentDivider}`}></div>
                  {co2Stats && (
                    <div className={styles.statsSecondary}>
                      <div className={styles.statItem}>
                        <div style={{ fontSize: "1.25rem", fontWeight: "600", color: getValueColor(co2Stats.avg, expectedCO2Min, expectedCO2Max) }}>
                          {co2Stats.avg.toFixed(0)} ppm
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Average
                        </div>
                      </div>
                      <div className={styles.statDivider}></div>
                      <div className={styles.statItem}>
                        <div style={{ fontSize: "1.25rem", fontWeight: "600", color: getValueColor(co2Stats.min, expectedCO2Min, expectedCO2Max) }}>
                          {co2Stats.min.toFixed(0)} ppm
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Minimum
                        </div>
                      </div>
                      <div className={styles.statDivider}></div>
                      <div className={styles.statItem}>
                        <div style={{ fontSize: "1.25rem", fontWeight: "600", color: getValueColor(co2Stats.max, expectedCO2Min, expectedCO2Max) }}>
                          {co2Stats.max.toFixed(0)} ppm
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Maximum
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CO2 Chart - Full Width */}
          <div className="grid-item-full-width">
            {isLoadingMeasurements ? (
              <ChartSkeleton />
            ) : (
              <TimeSeriesChart
                data={co2ChartData}
                title="CO2 Levels Over Time"
                yAxisLabel="CO2 (ppm)"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
