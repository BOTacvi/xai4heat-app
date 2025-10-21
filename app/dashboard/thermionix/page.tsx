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

import React, { useState, useEffect } from "react";
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
  // State
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [measurements, setMeasurements] = useState<ThermionixMeasurement[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(false);
  const [expectedTempMin, setExpectedTempMin] = useState<number>(18);
  const [expectedTempMax, setExpectedTempMax] = useState<number>(24);
  const [expectedHumidityMin, setExpectedHumidityMin] = useState<number>(30);
  const [expectedHumidityMax, setExpectedHumidityMax] = useState<number>(60);

  // Date range with default to last week
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

  // Fetch devices on mount
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch("/api/devices");
        const data = await res.json();

        console.log("Fetched devices:", data);
        setDevices(data || []);

        // Auto-select first device
        if (data && data.length > 0) {
          setSelectedDeviceId(data[0].device_id);
        }
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
        if (data.settings) {
          setExpectedTempMin(data.settings.expected_temp_min ?? 18);
          setExpectedTempMax(data.settings.expected_temp_max ?? 24);
          setExpectedHumidityMin(data.settings.expected_pressure_min ?? 30);
          setExpectedHumidityMax(data.settings.expected_pressure_max ?? 60);
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

  // Prepare device options for select
  const deviceOptions: SelectOption[] = devices.map((device) => ({
    label: `${device.name} - ${device.location}`,
    value: device.device_id,
  }));

  // Get current values (latest measurement)
  const currentTemp =
    measurements.length > 0 ? measurements[0].temperature : null;
  const currentHumidity =
    measurements.length > 0 ? measurements[0].relative_humidity : null;
  const latestTimestamp =
    measurements.length > 0 ? measurements[0].datetime : undefined;

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

  console.log({ deviceOptions, selectedDeviceId, devices });

  return (
    <div className="page-container">
      <h1 className="page-title">Thermionix Monitoring</h1>

      {/* Apartment Selection in Card */}
      <div className="card-container">
        {isLoadingDevices ? (
          <div className="loading-text">Loading apartments...</div>
        ) : (
          <Select
            label="Select Apartment"
            options={deviceOptions}
            value={selectedDeviceId}
            onChange={(value) => setSelectedDeviceId(String(value))}
            placeholder="Choose an apartment"
            fullWidth
          />
        )}
      </div>

      {selectedDeviceId && (
        <div className="content-grid">
          {/* Temperature Card */}
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

          {/* Date Range Filter */}
          <div className="grid-item">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
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

          {/* Humidity Card */}
          <div className="grid-item">
            {isLoadingMeasurements ? (
              <MetricCardSkeleton />
            ) : (
              <MetricCard
                title="Current Humidity"
                value={currentHumidity}
                unit="%"
                expectedMin={expectedHumidityMin}
                expectedMax={expectedHumidityMax}
                timestamp={latestTimestamp}
              />
            )}
          </div>

          {/* Empty grid item for spacing */}
          <div className="grid-item"></div>

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
        </div>
      )}
    </div>
  );
}
