// app/api/devices/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const devices = await prisma.device.findMany();
  return NextResponse.json(devices);
}

export async function POST(req: Request) {
  const data = await req.json();
  const newDevice = await prisma.device.create({ data });
  return NextResponse.json(newDevice);
}
