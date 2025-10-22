/**
 * Devices API Route
 *
 * LEARNING: What is an API Route in Next.js?
 *
 * API routes are server-side endpoints that run on your Next.js server.
 * They allow you to create RESTful APIs without needing a separate backend.
 *
 * LOCATION: app/api/devices/route.ts
 * - The folder structure determines the URL: /api/devices
 * - route.ts is special - Next.js recognizes it as an API endpoint
 * - Export HTTP method functions: GET, POST, PUT, DELETE, PATCH
 *
 * WHY USE API ROUTES:
 * - Client Components can't directly use Prisma (it's server-only)
 * - API routes provide a clean boundary between frontend and database
 * - Can add authentication, validation, rate limiting in one place
 * - Can be called from anywhere (your app, mobile apps, other services)
 *
 * HOW CLIENT COMPONENTS FETCH DATA:
 * ```typescript
 * const response = await fetch('/api/devices')
 * const devices = await response.json()
 * ```
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/devices
 *
 * Fetches all devices from the database
 *
 * LEARNING: Prisma Query Explanation
 *
 * prisma.device.findMany() means:
 * - prisma: Your database client (configured in lib/prisma.ts)
 * - device: The model name from schema.prisma (maps to "devices" table)
 * - findMany(): SQL equivalent: SELECT * FROM devices
 *
 * QUERY OPTIONS (examples):
 * ```typescript
 * // With filtering
 * prisma.device.findMany({
 *   where: { location: 'L8' }  // WHERE location = 'L8'
 * })
 *
 * // With sorting
 * prisma.device.findMany({
 *   orderBy: { name: 'asc' }  // ORDER BY name ASC
 * })
 *
 * // With limiting
 * prisma.device.findMany({
 *   take: 10  // LIMIT 10
 * })
 *
 * // With selecting specific fields
 * prisma.device.findMany({
 *   select: { device_id: true, name: true }  // SELECT device_id, name FROM devices
 * })
 * ```
 *
 * ERROR HANDLING:
 * - Prisma throws if database is unreachable
 * - Wrapped in try-catch to return proper HTTP error responses
 *
 * AUTHENTICATION:
 * - Currently public (no auth check)
 * - TODO: Add auth check if devices should be private per user
 *
 * @returns JSON array of all Device objects
 */
export async function GET() {
  try {
    // COMMENT: Query all devices from database
    // WHY no WHERE clause: We want all devices for the selector dropdown
    // NOTE: Sorting is done on frontend for complex lamela/building/apartment sorting
    const devices = await prisma.device.findMany();

    // COMMENT: Return devices as JSON
    // NextResponse.json() automatically:
    // - Sets Content-Type: application/json header
    // - Serializes JavaScript object to JSON string
    // - Returns 200 OK status code
    return NextResponse.json(devices);
  } catch (error) {
    // COMMENT: Error handling for database failures
    console.error("Error fetching devices:", error);

    // LEARNING: HTTP Status Codes
    // 500 = Internal Server Error (something broke on our server)
    // 400 = Bad Request (client sent invalid data)
    // 401 = Unauthorized (not logged in)
    // 403 = Forbidden (logged in but not allowed)
    // 404 = Not Found (resource doesn't exist)
    return NextResponse.json(
      {
        error: "Failed to fetch devices",
        // COMMENT: Only expose detailed error in development
        // In production, don't leak internal error messages to clients
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/devices
 *
 * Creates a new device in the database
 *
 * LEARNING: Creating Records with Prisma
 *
 * prisma.device.create() means:
 * - SQL equivalent: INSERT INTO devices (...) VALUES (...)
 * - Returns the created record (with any auto-generated fields)
 *
 * REQUEST BODY EXAMPLE:
 * ```json
 * {
 *   "device_id": "SENSOR_001",
 *   "name": "L8_33_67",
 *   "location": "L8",
 *   "description": "Apartment 67 sensor"
 * }
 * ```
 *
 * VALIDATION:
 * - TODO: Add Zod schema validation for robust input checking
 * - Currently trusts client data (dangerous in production!)
 *
 * @param req - Next.js Request object containing JSON body
 * @returns JSON object of the created Device
 */
export async function POST(req: Request) {
  try {
    // STEP 1: Authenticate user
    // COMMENT: Only authenticated users should be able to create devices
    // LEARNING: createServerClient() is async, we must await it first
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STEP 2: Parse JSON body from request
    // LEARNING: await req.json() reads and parses the request body
    // It's async because reading the body is an I/O operation
    const data = await req.json();

    // STEP 3: Validate required fields
    // COMMENT: Basic validation - in production, use Zod for comprehensive validation
    if (!data.device_id || !data.name) {
      return NextResponse.json(
        { error: "Missing required fields: device_id and name" },
        { status: 400 }
      );
    }

    // STEP 4: Create device in database
    // COMMENT: Prisma validates types and constraints from schema.prisma
    // NOTE: device_type is Unsupported enum in Prisma, so we omit it from creation
    // If you need to set device_type, use raw SQL query instead
    const newDevice = await prisma.device.create({
      data: {
        device_id: data.device_id,
        name: data.name,
        location: data.location || null,
        description: data.description || null,
        // device_type omitted - it's an unsupported enum type in Prisma
      },
    });

    // STEP 5: Return created device
    // LEARNING: 201 Created status indicates successful resource creation
    return NextResponse.json(newDevice, { status: 201 });
  } catch (error) {
    console.error("Error creating device:", error);

    // COMMENT: Check for unique constraint violations
    // Prisma error codes: https://www.prisma.io/docs/reference/api-reference/error-reference
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Device with this device_id already exists" },
        { status: 409 } // 409 Conflict
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create device",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
