import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lamela = searchParams.get("lamela");

  const data = await prisma.weatherlink_measurements.findMany({
    where: lamela ? { location: { contains: lamela } } : {}, // return all if lamela not specified
    orderBy: { datetime: "desc" },
    take: 200,
  });

  return NextResponse.json(data);
}
