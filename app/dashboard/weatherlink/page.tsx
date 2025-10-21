/**
 * WeatherLink Page
 *
 * Displays comprehensive weather data from WeatherLink weather station
 * Uses grid layout for better responsive design
 */

"use client";

import React, { useState, useEffect } from "react";
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
  const [measurements, setMeasurements] = useState<WeatherLinkMeasurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getLastWeekRange = (): DateRange => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return {
      from: weekAgo.toISOString(),
      to: now.toISOString(),
    };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getLastWeekRange());

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
      <h1 className={styles.title}>WeatherLink Monitoring</h1>

      {/* Date Range Filter in Card */}
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

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
