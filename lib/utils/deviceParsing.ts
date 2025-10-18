/**
 * Device ID Parsing Utilities
 *
 * LEARNING: Why do we need these utilities?
 *
 * PROBLEM: Device names are stored in database as strings like "L8_33_67"
 * - L8 = Lamela 8 (building complex)
 * - 33 = Building 33
 * - 67 = Apartment 67
 *
 * SOLUTION: These utilities extract meaningful parts from device names
 * so we can:
 * 1. Display human-readable labels ("Lamela 8, Building 33, Apartment 67")
 * 2. Filter devices by lamela
 * 3. Group devices by building
 * 4. Sort devices logically
 *
 * DATABASE STRUCTURE REMINDER:
 * - Device.name: "L8_33_67" (full location code)
 * - Device.location: "L8" (just the lamela part)
 */

/**
 * ParsedDeviceName - Structured representation of device name
 *
 * LEARNING: This is a TypeScript interface that defines
 * the shape of our parsed data
 */
export interface ParsedDeviceName {
  // Raw original name (e.g., "L8_33_67")
  raw: string

  // Lamela number (e.g., 8)
  lamela: number

  // Building number (e.g., 33)
  building: number

  // Apartment number (e.g., 67)
  apartment: number

  // Human-readable display string (e.g., "Lamela 8, Building 33, Apartment 67")
  display: string

  // Short display for dropdowns (e.g., "L8-B33-A67")
  shortDisplay: string
}

/**
 * parseDeviceName - Parse device name string into structured data
 *
 * LEARNING: This is the main parsing function
 *
 * HOW IT WORKS:
 * 1. Split string by underscore: "L8_33_67" → ["L8", "33", "67"]
 * 2. Extract lamela number: "L8" → 8
 * 3. Parse building and apartment as integers
 * 4. Generate display strings
 *
 * ERROR HANDLING:
 * - Returns null if format doesn't match expected pattern
 * - Allows components to handle invalid data gracefully
 *
 * @param name - Device name string (e.g., "L8_33_67")
 * @returns ParsedDeviceName object or null if invalid format
 *
 * USAGE EXAMPLE:
 * ```typescript
 * const parsed = parseDeviceName("L8_33_67")
 * if (parsed) {
 *   console.log(parsed.display) // "Lamela 8, Building 33, Apartment 67"
 *   console.log(parsed.lamela)  // 8
 * }
 * ```
 */
export function parseDeviceName(name: string | null | undefined): ParsedDeviceName | null {
  // COMMENT: Handle null/undefined gracefully
  if (!name) {
    return null
  }

  // COMMENT: Split by underscore
  // Expected format: "L{number}_{number}_{number}"
  const parts = name.split('_')

  // COMMENT: Validate we have exactly 3 parts
  if (parts.length !== 3) {
    console.warn(`Invalid device name format: ${name}. Expected format: L{num}_{num}_{num}`)
    return null
  }

  const [lamelaPart, buildingPart, apartmentPart] = parts

  // COMMENT: Extract lamela number from "L8" → 8
  // Use regex to extract number after 'L'
  const lamelaMatch = lamelaPart.match(/^L(\d+)$/)

  if (!lamelaMatch) {
    console.warn(`Invalid lamela format: ${lamelaPart}. Expected format: L{number}`)
    return null
  }

  // COMMENT: Parse all numbers
  const lamela = parseInt(lamelaMatch[1], 10)
  const building = parseInt(buildingPart, 10)
  const apartment = parseInt(apartmentPart, 10)

  // COMMENT: Validate all parsed successfully
  if (isNaN(lamela) || isNaN(building) || isNaN(apartment)) {
    console.warn(`Failed to parse numbers from: ${name}`)
    return null
  }

  // COMMENT: Generate human-readable display strings
  const display = `Lamela ${lamela}, Building ${building}, Apartment ${apartment}`
  const shortDisplay = `L${lamela}-B${building}-A${apartment}`

  return {
    raw: name,
    lamela,
    building,
    apartment,
    display,
    shortDisplay
  }
}

/**
 * parseDeviceLocation - Parse location string (just the lamela part)
 *
 * LEARNING: Location field in Device table stores just "L8" format
 *
 * WHY SEPARATE FROM parseDeviceName?
 * - Device.location is stored separately from Device.name
 * - Sometimes you only need lamela info, not full address
 * - Simpler parsing logic for simpler data
 *
 * @param location - Location string (e.g., "L8")
 * @returns Lamela number (e.g., 8) or null if invalid
 *
 * USAGE EXAMPLE:
 * ```typescript
 * const lamela = parseDeviceLocation("L8")
 * console.log(lamela) // 8
 * ```
 */
export function parseDeviceLocation(location: string | null | undefined): number | null {
  if (!location) {
    return null
  }

  // COMMENT: Extract number from "L8" format
  const match = location.match(/^L(\d+)$/)

  if (!match) {
    console.warn(`Invalid location format: ${location}. Expected format: L{number}`)
    return null
  }

  const lamela = parseInt(match[1], 10)

  if (isNaN(lamela)) {
    return null
  }

  return lamela
}

/**
 * formatLamelaDisplay - Generate display string for lamela
 *
 * LEARNING: Convenience function for consistent UI display
 *
 * @param lamela - Lamela number (e.g., 8)
 * @returns Display string (e.g., "Lamela 8")
 */
export function formatLamelaDisplay(lamela: number): string {
  return `Lamela ${lamela}`
}

/**
 * groupDevicesByLamela - Group devices by their lamela number
 *
 * LEARNING: Helper function for organizing device lists in UI
 *
 * WHY THIS IS USEFUL:
 * - SCADA page needs to show devices grouped by lamela
 * - Dropdown selectors can show organized hierarchies
 * - Makes UI more user-friendly
 *
 * HOW IT WORKS:
 * 1. Parse each device name
 * 2. Group by lamela number
 * 3. Return Map<lamela, devices[]>
 *
 * @param devices - Array of devices with 'name' property
 * @returns Map of lamela number to array of devices
 *
 * USAGE EXAMPLE:
 * ```typescript
 * const grouped = groupDevicesByLamela(allDevices)
 * grouped.forEach((devices, lamela) => {
 *   console.log(`Lamela ${lamela} has ${devices.length} devices`)
 * })
 * ```
 */
export function groupDevicesByLamela<T extends { name: string | null }>(
  devices: T[]
): Map<number, T[]> {
  // COMMENT: Use Map instead of object for better iteration
  const grouped = new Map<number, T[]>()

  for (const device of devices) {
    const parsed = parseDeviceName(device.name)

    if (!parsed) {
      // COMMENT: Skip devices with invalid names
      continue
    }

    // COMMENT: Get or create array for this lamela
    const existing = grouped.get(parsed.lamela) || []
    existing.push(device)
    grouped.set(parsed.lamela, existing)
  }

  return grouped
}

/**
 * getUniqueLamelas - Extract unique lamela numbers from device list
 *
 * LEARNING: Useful for building lamela selector dropdowns
 *
 * @param devices - Array of devices with 'location' property
 * @returns Sorted array of unique lamela numbers
 *
 * USAGE EXAMPLE:
 * ```typescript
 * const lamelas = getUniqueLamelas(allDevices)
 * // [8, 9, 10, 11] - sorted lamela numbers
 * ```
 */
export function getUniqueLamelas(devices: { location: string | null }[]): number[] {
  // COMMENT: Use Set to automatically handle uniqueness
  const lamelaSet = new Set<number>()

  for (const device of devices) {
    const lamela = parseDeviceLocation(device.location)

    if (lamela !== null) {
      lamelaSet.add(lamela)
    }
  }

  // COMMENT: Convert Set to Array and sort numerically
  return Array.from(lamelaSet).sort((a, b) => a - b)
}
