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

    let data: any[];
    if (!from && !to) {
      // No date range — fast path: return most recent N records
      data = await prisma.weatherlink_measurements.findMany({
        where: whereClause,
        orderBy: { datetime: "desc" },
        take: limit,
      });
    } else {
      // Date range specified — sample evenly across the full range
      const totalCount = await prisma.weatherlink_measurements.count({ where: whereClause });

      if (totalCount <= limit) {
        data = await prisma.weatherlink_measurements.findMany({
          where: whereClause,
          orderBy: { datetime: "asc" },
        });
      } else {
        const step = Math.max(1, Math.floor(totalCount / limit));
        const fromISO = from ? from.toISOString() : null;
        const toISO = to ? to.toISOString() : null;
        const fromClause = fromISO ? `AND datetime >= '${fromISO}'::timestamptz` : "";
        const toClause = toISO ? `AND datetime <= '${toISO}'::timestamptz` : "";

        try {
          data = await prisma.$queryRawUnsafe(`
            SELECT datetime, location, bar_trend, bar, temp_in, hum_in, temp_out, wind_speed,
                   wind_speed_10_min_avg, wind_dir, hum_out, rain_rate_mm, uv, solar_rad,
                   rain_storm_mm, rain_storm_start_date, rain_day_mm, rain_month_mm, rain_year_mm,
                   et_day, et_month, et_year, wet_leaf_4, forecast_rule, forecast_desc,
                   dew_point, heat_index, wind_chill, wind_gust_10_min
            FROM (
              SELECT datetime, location, bar_trend, bar, temp_in, hum_in, temp_out, wind_speed,
                     wind_speed_10_min_avg, wind_dir, hum_out, rain_rate_mm, uv, solar_rad,
                     rain_storm_mm, rain_storm_start_date, rain_day_mm, rain_month_mm, rain_year_mm,
                     et_day, et_month, et_year, wet_leaf_4, forecast_rule, forecast_desc,
                     dew_point, heat_index, wind_chill, wind_gust_10_min,
                     ROW_NUMBER() OVER (ORDER BY datetime ASC) AS rn
              FROM "xai4heat_db"."weatherlink_measurements"
              WHERE 1=1 ${fromClause} ${toClause}
            ) sub
            WHERE (rn - 1) % ${step} = 0
            ORDER BY datetime ASC
            LIMIT ${limit}
          `);
        } catch (rawSqlError) {
          console.error("[WEATHERLINK API] Raw SQL sampling failed, falling back:", rawSqlError);
          data = (await prisma.weatherlink_measurements.findMany({
            where: whereClause,
            orderBy: { datetime: "desc" },
            take: limit,
          })).reverse();
        }
      }
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
