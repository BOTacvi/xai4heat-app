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
  e: number | null;
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
  const handleNewMeasurement = useCallback((newMeasurement: RealtimeSCADAMeasurement) => {
    setMeasurements(prev => {
      // Prepend new measurement
      const updated = [newMeasurement, ...prev];

      // Limit array size to prevent memory issues (keep last 500)
      return updated.slice(0, 500);
    });
  }, []);

  // Subscribe to realtime updates
  const { isConnected } = useSCADARealtime({
    lamela: selectedLamela,
    onNewMeasurement: handleNewMeasurement,
    enabled: !!selectedLamela // Only subscribe when lamela selected
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
  const latestTimestamp =
    measurements.length > 0 ? measurements[0].datetime : undefined;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>SCADA Monitoring</h1>
        {selectedLamela && <ConnectionBadge isConnected={isConnected} />}
      </div>

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

      {selectedLamela && (
        <div className="content-grid">
          <div className="grid-item">
            {isLoadingMeasurements ? (
              <MetricCardSkeleton />
            ) : (
              <MetricCard
                title="Current Temperature"
                value={currentTemp}
                unit="°C"
                expectedMin={expectedTempMin}
                expectedMax={expectedTempMax}
                timestamp={latestTimestamp}
              />
            )}
          </div>

          <div className="grid-item">
            <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
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

          <div className="grid-item">
            {isLoadingMeasurements ? (
              <MetricCardSkeleton />
            ) : (
              <MetricCard
                title="Current Pressure"
                value={currentPressure}
                unit="bar"
                expectedMin={expectedPressureMin}
                expectedMax={expectedPressureMax}
                timestamp={latestTimestamp}
              />
            )}
          </div>

          <div className="grid-item"></div>

          <div className="grid-item-full-width">
            {isLoadingMeasurements ? (
              <ChartSkeleton />
            ) : (
              <TimeSeriesChart
                data={pressureChartData}
                title="Pressure Over Time"
                yAxisLabel="Pressure (bar)"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
