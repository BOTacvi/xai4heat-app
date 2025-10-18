/**
 * Thermionix Measurements API Route
 *
 * LEARNING: This API endpoint fetches temperature/humidity/CO2 data for apartments
 *
 * ENDPOINT: GET /api/thermionix?device_id=42&from=2024-01-01&to=2024-01-31
 *
 * QUERY PARAMETERS:
 * - device_id (required): Integer ID of the device/sensor
 * - from (optional): Start datetime for filtering (ISO 8601 format)
 * - to (optional): End datetime for filtering (ISO 8601 format)
 * - limit (optional): Max number of records to return (default: 100)
 *
 * HOW IT WORKS:
 * 1. Client sends device_id as query parameter (e.g., ?device_id=42)
 * 2. We query thermionyx_measurements table filtering by device_id
 * 3. Optionally filter by date range (for graphs showing specific time periods)
 * 4. Return latest measurements ordered by datetime DESC
 *
 * DATABASE STRUCTURE:
 * thermionyx_measurements table:
 * - datetime (DateTime): When measurement was taken - PART OF PRIMARY KEY
 * - device_id (Int): Which device/sensor recorded it - PART OF PRIMARY KEY
 * - probe_id (Int): Which probe on the device - PART OF PRIMARY KEY
 * - temperature (Float?): Temperature in Celsius (nullable)
 * - relative_humidity (Float?): Humidity percentage (nullable)
 * - co2 (Float?): CO2 level (nullable)
 *
 * PRIMARY KEY: [datetime, device_id, probe_id]
 * - This composite key ensures uniqueness
 * - Multiple probes can report different values at same datetime for same device
 *
 * WHY THIS STRUCTURE:
 * - device_id (INT) in thermionyx_measurements does NOT directly relate to Device table
 * - Device table has device_id (STRING) - different system!
 * - Device table has 'name' field with format "L8_33_67" (Lamela_Building_Apartment)
 * - We filter measurements by device_id integer, not by parsing name strings
 * - This is a limitation/quirk of the database design to be aware of
 *
 * EXAMPLE USAGE:
 * ```typescript
 * // Fetch latest 100 measurements for device 42
 * const res = await fetch('/api/thermionix?device_id=42')
 * const data = await res.json()
 *
 * // Fetch measurements for date range
 * const res = await fetch('/api/thermionix?device_id=42&from=2024-01-01T00:00:00Z&to=2024-01-31T23:59:59Z')
 * ```
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    // STEP 1: Parse query parameters
    // LEARNING: new URL(req.url) creates a URL object we can inspect
    // searchParams gives us access to ?key=value query string
    const { searchParams } = new URL(req.url);
    const deviceIdParam = searchParams.get("device_id");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const limitParam = searchParams.get("limit");

    // STEP 2: Validate required parameters
    // COMMENT: Validate that device_id parameter is provided
    // Without it, we don't know which apartment's data to fetch
    if (!deviceIdParam) {
      return NextResponse.json(
        {
          error: "Missing required parameter: device_id",
          example: "/api/thermionix?device_id=42",
        },
        { status: 400 }
      );
    }

    // STEP 3: Parse and validate device_id
    // COMMENT: Parse device_id to integer
    // The thermionyx_measurements table stores device_id as Int, not String
    // parseInt(str, 10) means: parse as base-10 integer
    const deviceId = parseInt(deviceIdParam, 10);

    if (isNaN(deviceId)) {
      return NextResponse.json(
        {
          error: "device_id must be a valid integer",
          received: deviceIdParam,
        },
        { status: 400 }
      );
    }

    // STEP 4: Parse optional parameters
    // COMMENT: Date filtering for graphs showing specific time ranges
    // Dates should be in ISO 8601 format: "2024-01-01T00:00:00Z"
    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    // COMMENT: Validate parsed dates
    if (from && isNaN(from.getTime())) {
      return NextResponse.json(
        {
          error: "Invalid 'from' date format. Use ISO 8601 format.",
          example: "2024-01-01T00:00:00Z",
        },
        { status: 400 }
      );
    }

    if (to && isNaN(to.getTime())) {
      return NextResponse.json(
        {
          error: "Invalid 'to' date format. Use ISO 8601 format.",
          example: "2024-01-31T23:59:59Z",
        },
        { status: 400 }
      );
    }

    // COMMENT: Validate limit is reasonable
    if (isNaN(limit) || limit < 1 || limit > 10000) {
      return NextResponse.json(
        {
          error: "Limit must be between 1 and 10000",
          received: limitParam,
        },
        { status: 400 }
      );
    }

    // STEP 5: Build Prisma query with dynamic WHERE clause
    // LEARNING: We build the WHERE object conditionally based on params
    // This is more efficient than separate queries for each case

    // COMMENT: Start with required filter (device_id)
    const whereClause: any = {
      device_id: deviceId,
    };

    // COMMENT: Add date filters if provided
    // WHY separate gte/lte: Allows filtering date ranges
    // gte = Greater Than or Equal
    // lte = Less Than or Equal
    if (from || to) {
      whereClause.datetime = {};

      if (from) {
        // LEARNING: Prisma date filtering
        // gte means >=, so this includes the "from" date
        whereClause.datetime.gte = from;
      }

      if (to) {
        // lte means <=, so this includes the "to" date
        whereClause.datetime.lte = to;
      }
    }

    // STEP 6: Execute database query
    // COMMENT: Query thermionyx_measurements table
    // WHY thermionyx_measurements? This is the corrected table name for Thermionix sensor data
    // (previously incorrectly used tuya_measurements - that's been removed)
    //
    // LEARNING: Prisma query breakdown
    // - findMany(): Returns array of records (vs findFirst/findUnique)
    // - where: SQL WHERE clause (filtering)
    // - orderBy: SQL ORDER BY clause (sorting)
    // - take: SQL LIMIT clause (max records to return)
    const data = await prisma.thermionyx_measurements.findMany({
      where: whereClause,
      orderBy: {
        datetime: "desc", // Most recent first (DESC = descending)
      },
      take: limit, // Limit to prevent huge responses
    });

    // STEP 7: Return successful response
    // COMMENT: Return measurements as JSON
    // Client components will use this data for:
    // - Temperature cards showing current value
    // - Graphs displaying historical trends
    // - Real-time comparisons with expected ranges
    return NextResponse.json({
      device_id: deviceId,
      count: data.length,
      measurements: data,
    });
  } catch (error) {
    // STEP 8: Handle errors
    console.error("Error fetching thermionix measurements:", error);

    // COMMENT: Error handling for various failure modes
    // - Database connection failures
    // - Query syntax errors
    // - Unexpected data types
    return NextResponse.json(
      {
        error: "Failed to fetch measurements",
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
