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

import React, { useState, useEffect, useMemo } from "react";
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
  const [expectedTempMax, setExpectedTempMax] = useState<number>(24);
  const [expectedHumidityMin, setExpectedHumidityMin] = useState<number>(30);
  const [expectedHumidityMax, setExpectedHumidityMax] = useState<number>(60);

  // Fetch devices on mount
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch("/api/devices");
        const data = await res.json();

        console.log("Fetched devices:", data);
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
            onChange={(value) => handleDeviceChange(String(value))}
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
            <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
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
