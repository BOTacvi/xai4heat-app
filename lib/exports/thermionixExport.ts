/**
 * Thermionix Export Configuration
 *
 * PURPOSE:
 * - Defines column structure for Thermionix data export
 * - Provides helper functions for formatting Thermionix-specific data
 * - Reusable across different export formats if needed
 *
 * USAGE:
 * ```typescript
 * import { exportThermionixData } from '@/lib/exports/thermionixExport'
 * exportThermionixData(measurements, apartmentName, dateRange, stats)
 * ```
 */

import {
  exportWithSummary,
  formatDateForExport,
  type ExportColumn,
  type HeaderInfo,
} from '@/lib/utils/excelExport'

/**
 * Thermionix Measurement Type (matches API response)
 */
export type ThermionixMeasurement = {
  datetime: string
  device_id: number
  probe_id: number
  temperature: number | null
  relative_humidity: number | null
  co2: number | null
}

/**
 * Statistics for summary section
 */
export type ThermionixStats = {
  temperature?: { avg: number; min: number; max: number } | null
  humidity?: { avg: number; min: number; max: number } | null
  co2?: { avg: number; min: number; max: number } | null
}

/**
 * Date range type
 */
export type DateRange = {
  from: string
  to: string
}

/**
 * Column definitions for Thermionix data
 */
export const THERMIONIX_COLUMNS: ExportColumn<ThermionixMeasurement>[] = [
  {
    key: 'datetime',
    header: 'Date/Time',
    width: 20,
    formatter: (value) => formatDateForExport(value),
  },
  {
    key: 'temperature',
    header: 'Temperature (°C)',
    width: 18,
    formatter: (value) => (value !== null ? Number(value.toFixed(1)) : '—'),
  },
  {
    key: 'relative_humidity',
    header: 'Humidity (%)',
    width: 15,
    formatter: (value) => (value !== null ? Number(value.toFixed(1)) : '—'),
  },
  {
    key: 'co2',
    header: 'CO2 (ppm)',
    width: 12,
    formatter: (value) => (value !== null ? Math.round(value) : '—'),
  },
]

/**
 * Format apartment name for display
 * Input: "L8_33_67" -> Output: "Lamela 8 / Building 33 / Apartment 67"
 */
export function formatApartmentName(deviceName: string): string {
  const parts = deviceName.split('_')

  if (parts.length >= 3) {
    const lamela = parts[0].replace('L', '')
    const building = parts[1]
    const apartment = parts[2]
    return `Lamela ${lamela} / Building ${building} / Apartment ${apartment}`
  }

  return deviceName
}

/**
 * Format apartment name for filename (safe characters)
 * Input: "L8_33_67" -> Output: "L8-33-67"
 */
export function formatApartmentForFilename(deviceName: string): string {
  return deviceName.replace(/_/g, '-')
}

/**
 * Format date range for display
 */
export function formatDateRange(dateRange: DateRange): string {
  const fromDate = new Date(dateRange.from)
  const toDate = new Date(dateRange.to)

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  return `${formatDate(fromDate)} - ${formatDate(toDate)}`
}

/**
 * Format date range for filename (safe characters)
 * Output format: "2024-01-01_to_2024-01-31"
 */
export function formatDateRangeForFilename(dateRange: DateRange): string {
  const fromDate = new Date(dateRange.from)
  const toDate = new Date(dateRange.to)

  const formatDate = (d: Date) => d.toISOString().split('T')[0] // YYYY-MM-DD

  return `${formatDate(fromDate)}_to_${formatDate(toDate)}`
}

/**
 * Export Thermionix measurements to Excel
 *
 * @param measurements - Array of measurement data
 * @param apartmentName - Device name (e.g., "L8_33_67")
 * @param dateRange - Date range for the export
 * @param stats - Optional statistics for summary section
 */
export function exportThermionixData(
  measurements: ThermionixMeasurement[],
  apartmentName: string,
  dateRange: DateRange,
  stats?: ThermionixStats
): void {
  // Build header info
  const headerInfo: HeaderInfo[] = [
    { label: 'Apartment', value: formatApartmentName(apartmentName) },
    { label: 'Date Range', value: formatDateRange(dateRange) },
    { label: 'Total Records', value: measurements.length.toString() },
    { label: 'Exported At', value: formatDateForExport(new Date()) },
  ]

  // Build summary rows if stats provided
  const summaryRows: { label: string; values: (string | number)[] }[] = []

  if (stats) {
    // Header row for summary
    summaryRows.push({
      label: 'Metric',
      values: ['Average', 'Minimum', 'Maximum'],
    })

    if (stats.temperature) {
      summaryRows.push({
        label: 'Temperature (°C)',
        values: [
          stats.temperature.avg.toFixed(1),
          stats.temperature.min.toFixed(1),
          stats.temperature.max.toFixed(1),
        ],
      })
    }

    if (stats.humidity) {
      summaryRows.push({
        label: 'Humidity (%)',
        values: [
          stats.humidity.avg.toFixed(1),
          stats.humidity.min.toFixed(1),
          stats.humidity.max.toFixed(1),
        ],
      })
    }

    if (stats.co2) {
      summaryRows.push({
        label: 'CO2 (ppm)',
        values: [
          Math.round(stats.co2.avg).toString(),
          Math.round(stats.co2.min).toString(),
          Math.round(stats.co2.max).toString(),
        ],
      })
    }
  }

  // Generate filename: Apartment_DateRange (e.g., L8-33-67_2024-01-01_to_2024-01-31.xlsx)
  const filename = `${formatApartmentForFilename(apartmentName)}_${formatDateRangeForFilename(dateRange)}`

  // Export with summary
  exportWithSummary(
    measurements,
    THERMIONIX_COLUMNS,
    {
      filename,
      sheetName: 'Measurements',
      title: `Thermionix Measurements - ${formatApartmentName(apartmentName)}`,
      includeTimestamp: false, // Date range is already in filename
    },
    headerInfo,
    summaryRows.length > 0 ? summaryRows : undefined
  )
}
