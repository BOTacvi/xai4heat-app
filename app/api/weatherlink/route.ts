/**
 * WeatherLink Measurements API Route
 *
 * ENDPOINT: GET /api/weatherlink?from=2024-01-01&to=2024-01-31
 *
 * QUERY PARAMETERS:
 * - from (optional): Start datetime for filtering (ISO 8601 format)
 * - to (optional): End datetime for filtering (ISO 8601 format)
 * - limit (optional): Max number of records to return (default: 200)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const limitParam = searchParams.get("limit");

    console.log("[WEATHERLINK API] Query params:", {
      fromParam,
      toParam,
      limitParam,
    });

    // Parse optional parameters
    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 200;

    console.log("[WEATHERLINK API] Parsed dates:", { from, to });

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

    if (from || to) {
      whereClause.datetime = {};
      if (from) {
        whereClause.datetime.gte = from;
      }
      if (to) {
        whereClause.datetime.lte = to;
      }
    }

    console.log(
      "[WEATHERLINK API] WHERE clause:",
      JSON.stringify(whereClause, null, 2)
    );

    const data = await prisma.weatherlink_measurements.findMany({
      where: whereClause,
      orderBy: {
        datetime: "desc",
      },
      take: limit,
    });

    console.log("[WEATHERLINK API] Found", data.length, "measurements");
    if (data.length > 0) {
      console.log(
        "[WEATHERLINK API] First result datetime:",
        data[0].datetime
      );
      console.log(
        "[WEATHERLINK API] Last result datetime:",
        data[data.length - 1].datetime
      );
    }

    return NextResponse.json({
      count: data.length,
      measurements: data,
    });
  } catch (error) {
    console.error("Error fetching WeatherLink measurements:", error);
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
