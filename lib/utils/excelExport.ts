/**
 * Excel Export Utility
 *
 * PURPOSE:
 * - Reusable functions for exporting data to Excel format
 * - Supports custom headers, column definitions, and formatting
 * - Works with any data structure via column configuration
 *
 * USAGE:
 * 1. Define columns with ExportColumn interface
 * 2. Call exportToExcel with data, columns, and options
 * 3. File downloads automatically in the browser
 *
 * EXAMPLE:
 * ```typescript
 * const columns: ExportColumn<MyData>[] = [
 *   { key: 'name', header: 'Name' },
 *   { key: 'value', header: 'Value', formatter: (v) => v.toFixed(2) },
 * ]
 * exportToExcel(data, columns, { filename: 'export', title: 'My Report' })
 * ```
 */

import * as XLSX from 'xlsx'

/**
 * Column Definition
 *
 * @template T - The data type of the rows
 */
export type ExportColumn<T> = {
  /** Key in the data object to extract value from */
  key: keyof T | string
  /** Header text to display in Excel */
  header: string
  /** Optional width in characters (default: auto) */
  width?: number
  /** Optional formatter function to transform the value */
  formatter?: (value: any, row: T) => string | number
}

/**
 * Export Options
 */
export type ExportOptions = {
  /** Filename without extension */
  filename: string
  /** Sheet name (default: 'Data') */
  sheetName?: string
  /** Title to display in header row */
  title?: string
  /** Subtitle/description for second header row */
  subtitle?: string
  /** Include timestamp in filename */
  includeTimestamp?: boolean
}

/**
 * Header Info for Excel
 * Used to create informational header rows above the data
 */
export type HeaderInfo = {
  label: string
  value: string
}

/**
 * Format date for display
 */
export function formatDateForExport(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Format date for filename (safe characters only)
 */
export function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

/**
 * Get cell value from row using column definition
 */
function getCellValue<T>(row: T, column: ExportColumn<T>): string | number {
  // Handle nested keys like 'user.name'
  const keys = String(column.key).split('.')
  let value: any = row

  for (const key of keys) {
    value = value?.[key]
  }

  // Apply formatter if provided
  if (column.formatter) {
    return column.formatter(value, row)
  }

  // Handle null/undefined
  if (value === null || value === undefined) {
    return '—'
  }

  // Handle dates
  if (value instanceof Date) {
    return formatDateForExport(value)
  }

  return value
}

/**
 * Export data to Excel file
 *
 * @template T - The data type of the rows
 * @param data - Array of data objects to export
 * @param columns - Column definitions
 * @param options - Export options (filename, title, etc.)
 * @param headerInfo - Optional header information rows
 */
export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions,
  headerInfo?: HeaderInfo[]
): void {
  const {
    filename,
    sheetName = 'Data',
    title,
    subtitle,
    includeTimestamp = true,
  } = options

  // Build rows array
  const rows: (string | number)[][] = []

  // Add title if provided
  if (title) {
    rows.push([title])
    rows.push([]) // Empty row for spacing
  }

  // Add subtitle if provided
  if (subtitle) {
    rows.push([subtitle])
    rows.push([]) // Empty row for spacing
  }

  // Add header info rows if provided
  if (headerInfo && headerInfo.length > 0) {
    for (const info of headerInfo) {
      rows.push([info.label, info.value])
    }
    rows.push([]) // Empty row for spacing
  }

  // Add column headers
  const headers = columns.map(col => col.header)
  rows.push(headers)

  // Add data rows
  for (const row of data) {
    const rowData = columns.map(col => getCellValue(row, col))
    rows.push(rowData)
  }

  // Create worksheet from rows
  const worksheet = XLSX.utils.aoa_to_sheet(rows)

  // Set column widths
  const columnWidths = columns.map(col => ({
    wch: col.width || Math.max(col.header.length, 15),
  }))
  worksheet['!cols'] = columnWidths

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Generate filename with optional timestamp
  let finalFilename = filename
  if (includeTimestamp) {
    finalFilename += `_${formatDateForFilename(new Date())}`
  }
  finalFilename += '.xlsx'

  // Trigger download
  XLSX.writeFile(workbook, finalFilename)
}

/**
 * Export with summary statistics
 *
 * Adds a summary section at the end of the sheet with calculated stats
 */
export function exportWithSummary<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions,
  headerInfo?: HeaderInfo[],
  summaryRows?: { label: string; values: (string | number)[] }[]
): void {
  const {
    filename,
    sheetName = 'Data',
    title,
    subtitle,
    includeTimestamp = true,
  } = options

  // Build rows array
  const rows: (string | number)[][] = []

  // Add title if provided
  if (title) {
    rows.push([title])
    rows.push([]) // Empty row for spacing
  }

  // Add subtitle if provided
  if (subtitle) {
    rows.push([subtitle])
    rows.push([]) // Empty row for spacing
  }

  // Add header info rows if provided
  if (headerInfo && headerInfo.length > 0) {
    for (const info of headerInfo) {
      rows.push([info.label, info.value])
    }
    rows.push([]) // Empty row for spacing
  }

  // Add column headers
  const headers = columns.map(col => col.header)
  rows.push(headers)

  // Add data rows
  for (const row of data) {
    const rowData = columns.map(col => getCellValue(row, col))
    rows.push(rowData)
  }

  // Add summary section if provided
  if (summaryRows && summaryRows.length > 0) {
    rows.push([]) // Empty row for spacing
    rows.push(['Summary'])
    rows.push([]) // Empty row for spacing

    for (const summary of summaryRows) {
      rows.push([summary.label, ...summary.values])
    }
  }

  // Create worksheet from rows
  const worksheet = XLSX.utils.aoa_to_sheet(rows)

  // Set column widths
  const columnWidths = columns.map(col => ({
    wch: col.width || Math.max(col.header.length, 15),
  }))
  worksheet['!cols'] = columnWidths

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Generate filename with optional timestamp
  let finalFilename = filename
  if (includeTimestamp) {
    finalFilename += `_${formatDateForFilename(new Date())}`
  }
  finalFilename += '.xlsx'

  // Trigger download
  XLSX.writeFile(workbook, finalFilename)
}
