/**
 * SCADA Measurements API Route
 *
 * ENDPOINT: GET /api/scada?lamela=L2&from=2024-01-01&to=2024-01-31
 *
 * QUERY PARAMETERS:
 * - lamela (optional): Lamela location identifier (e.g., "L2", "L3")
 *   - If provided: returns measurements for that specific lamela
 *   - If omitted: returns all measurements (useful for fetching unique lamelas)
 * - from (optional): Start datetime for filtering (ISO 8601 format)
 * - to (optional): End datetime for filtering (ISO 8601 format)
 * - limit (optional): Max number of records to return (default: 200)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/supabase/server";
import { checkScadaMeasurement } from "@/lib/utils/alertDetection";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lamela = searchParams.get("lamela");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const limitParam = searchParams.get("limit");

    console.log("[SCADA API] Query params:", { lamela, fromParam, toParam, limitParam });

    // Parse optional parameters
    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 200;

    console.log("[SCADA API] Parsed dates:", { from, to });

    // Validate dates
    if (from && isNaN(from.getTime())) {
      return NextResponse.json(
        { error: "Invalid 'from' date format. Use ISO 8601 format." },
        { status: 400 }
      );
    }

    if (to && isNaN(to.getTime())) {
      return NextResponse.json(
        { error: "Invalid 'to' date format. Use ISO 8601 format." },
        { status: 400 }
      );
    }

    // Build WHERE clause
    const whereClause: any = {};

    // Only filter by lamela if provided
    if (lamela) {
      whereClause.location = {
        contains: lamela,
      };
    }

    if (from || to) {
      whereClause.datetime = {};
      if (from) {
        whereClause.datetime.gte = from;
      }
      if (to) {
        whereClause.datetime.lte = to;
      }
    }

    console.log("[SCADA API] WHERE clause:", JSON.stringify(whereClause, null, 2));

    const data = await prisma.scada_measurements.findMany({
      where: whereClause,
      orderBy: {
        datetime: "desc",
      },
      take: limit,
    });

    console.log("[SCADA API] Found", data.length, "measurements");
    if (data.length > 0) {
      console.log("[SCADA API] First result datetime:", data[0].datetime);
      console.log("[SCADA API] Last result datetime:", data[data.length - 1].datetime);
    }

    return NextResponse.json({
      lamela: lamela || "all",
      count: data.length,
      measurements: data,
    });
  } catch (error) {
    console.error("Error fetching SCADA measurements:", error);
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

/**
 * POST /api/scada
 *
 * Create new SCADA measurements and trigger alert detection
 *
 * BODY:
 * {
 *   measurements: Array<{
 *     datetime: string (ISO 8601),
 *     location: string,
 *     t_amb?: number,
 *     t_ref?: number,
 *     t_sup_prim?: number,
 *     t_ret_prim?: number,
 *     t_sup_sec?: number,
 *     t_ret_sec?: number,
 *     e?: number (pressure),
 *     pe?: number
 *   }>
 * }
 */
export async function POST(req: Request) {
  try {
    // STEP 1: Get current user
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // STEP 2: Parse request body
    const body = await req.json()
    const { measurements } = body

    if (!measurements || !Array.isArray(measurements) || measurements.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { measurements: Array }' },
        { status: 400 }
      )
    }

    // STEP 3: Get user settings for threshold comparison
    const userSettings = await prisma.userSettings.findUnique({
      where: { user_id: user.id },
    })

    if (!userSettings) {
      return NextResponse.json(
        { error: 'User settings not found' },
        { status: 404 }
      )
    }

    // STEP 4: Process each measurement
    const createdMeasurements = []
    const errors = []

    for (const measurementData of measurements) {
      try {
        // Validate measurement data
        const {
          datetime,
          location,
          t_amb,
          t_ref,
          t_sup_prim,
          t_ret_prim,
          t_sup_sec,
          t_ret_sec,
          e,
          pe
        } = measurementData

        if (!datetime || !location) {
          errors.push({
            measurement: measurementData,
            error: 'Missing required fields: datetime, location'
          })
          continue
        }

        // Create measurement in database
        const measurement = await prisma.scada_measurements.create({
          data: {
            datetime: new Date(datetime),
            location: location,
            t_amb: t_amb !== undefined ? parseFloat(t_amb) : null,
            t_ref: t_ref !== undefined ? parseFloat(t_ref) : null,
            t_sup_prim: t_sup_prim !== undefined ? parseFloat(t_sup_prim) : null,
            t_ret_prim: t_ret_prim !== undefined ? parseFloat(t_ret_prim) : null,
            t_sup_sec: t_sup_sec !== undefined ? parseFloat(t_sup_sec) : null,
            t_ret_sec: t_ret_sec !== undefined ? parseFloat(t_ret_sec) : null,
            e: e !== undefined ? parseFloat(e) : null,
            pe: pe !== undefined ? parseFloat(pe) : null,
          },
        })

        createdMeasurements.push(measurement)

        // STEP 5: Trigger alert detection (fire and forget - don't await)
        // This runs asynchronously and doesn't block the response
        checkScadaMeasurement(
          {
            datetime: measurement.datetime,
            location: measurement.location,
            t_amb: measurement.t_amb,
            t_ref: measurement.t_ref,
            e: measurement.e,
            pe: measurement.pe,
          },
          {
            user_id: user.id,
            expected_temp_min: userSettings.expected_temp_min,
            expected_temp_max: userSettings.expected_temp_max,
            expected_pressure_min: userSettings.expected_pressure_min,
            expected_pressure_max: userSettings.expected_pressure_max,
          }
        ).catch((err) => {
          console.error('[SCADA POST] Alert detection failed:', err)
        })
      } catch (measurementError) {
        errors.push({
          measurement: measurementData,
          error: String(measurementError),
        })
      }
    }

    // STEP 6: Return response
    return NextResponse.json({
      success: true,
      created: createdMeasurements.length,
      errors: errors.length > 0 ? errors : undefined,
      measurements: createdMeasurements,
    }, { status: 201 })

  } catch (error) {
    console.error('[SCADA POST] Error creating measurements:', error)
    return NextResponse.json(
      {
        error: 'Failed to create measurements',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}
