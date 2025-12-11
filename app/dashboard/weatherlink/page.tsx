/**
 * WeatherLink Page
 *
 * Displays comprehensive weather data from WeatherLink weather station
 * Uses grid layout for better responsive design
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { useWeatherLinkRealtime } from "@/lib/hooks/useWeatherLinkRealtime";
import type { WeatherLinkMeasurement as RealtimeWeatherLinkMeasurement } from "@/lib/hooks/useWeatherLinkRealtime";
import styles from "./page.module.css";

type WeatherLinkMeasurement = {
  datetime: string;
  temp_out: number | null;
  hum_out: number | null;
  bar: number | null;
  wind_speed: number | null;
  rain_rate_mm: number | null;
  dew_point: number | null;
};

export default function WeatherLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const [measurements, setMeasurements] = useState<WeatherLinkMeasurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMeasurements = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          from: dateRange.from,
          to: dateRange.to,
          limit: "1000",
        });

        const res = await fetch(`/api/weatherlink?${params}`);
        const data = await res.json();
        setMeasurements(data.measurements || []);
      } catch (error) {
        console.error("Failed to fetch WeatherLink measurements:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeasurements();
  }, [dateRange]);

  // Handle new measurements from realtime - prepend to existing measurements
  const handleNewMeasurement = useCallback((newMeasurement: RealtimeWeatherLinkMeasurement) => {
    setMeasurements(prev => {
      // Prepend new measurement
      const updated = [newMeasurement, ...prev];

      // Limit array size to prevent memory issues (keep last 500)
      return updated.slice(0, 500);
    });
  }, []);

  // Subscribe to realtime updates (always enabled for weather station)
  const { isConnected } = useWeatherLinkRealtime({
    onNewMeasurement: handleNewMeasurement,
    enabled: true
  });

  // Handle date range change - write directly to URL
  const handleDateRangeChange = (newDateRange: DateRange) => {
    const params = new URLSearchParams();

    // Update with new date range
    params.set("from", newDateRange.from);
    params.set("to", newDateRange.to);

    const newURL = `/dashboard/weatherlink?${params.toString()}`;
    router.push(newURL);
  };

  const latest = measurements.length > 0 ? measurements[0] : null;
  const latestTimestamp = latest?.datetime;

  const tempChartData: TimeSeriesDataPoint[] = measurements
    .filter((m) => m.temp_out !== null)
    .map((m) => ({
      timestamp: m.datetime,
      value: m.temp_out!,
    }))
    .reverse();

  return (
    <div className={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className={styles.title} style={{ margin: 0 }}>WeatherLink Monitoring</h1>
        <ConnectionBadge isConnected={isConnected} />
      </div>

      {/* Date Range Filter in Card */}
      <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />

      {/* Main Content Grid */}
      <div className={styles.contentGrid}>
        {/* Temperature Card */}
        <div className={styles.gridItem}>
          {isLoading ? (
            <MetricCardSkeleton />
          ) : (
            <MetricCard
              title="Outdoor Temperature"
              value={latest?.temp_out ?? null}
              unit="°C"
              timestamp={latestTimestamp}
            />
          )}
        </div>

        {/* Humidity Card */}
        <div className={styles.gridItem}>
          {isLoading ? (
            <MetricCardSkeleton />
          ) : (
            <MetricCard
              title="Outdoor Humidity"
              value={latest?.hum_out ?? null}
              unit="%"
              timestamp={latestTimestamp}
            />
          )}
        </div>

        {/* Pressure Card */}
        <div className={styles.gridItem}>
          {isLoading ? (
            <MetricCardSkeleton />
          ) : (
            <MetricCard
              title="Barometric Pressure"
              value={latest?.bar ?? null}
              unit="inHg"
              timestamp={latestTimestamp}
            />
          )}
        </div>

        {/* Dew Point Card */}
        <div className={styles.gridItem}>
          {isLoading ? (
            <MetricCardSkeleton />
          ) : (
            <MetricCard
              title="Dew Point"
              value={latest?.dew_point ?? null}
              unit="°C"
              timestamp={latestTimestamp}
            />
          )}
        </div>

        {/* Temperature Chart - Full Width */}
        <div className={styles.gridItemFullWidth}>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <TimeSeriesChart
              data={tempChartData}
              title="Outdoor Temperature Over Time"
              yAxisLabel="Temperature (°C)"
            />
          )}
        </div>
      </div>
    </div>
  );
}
