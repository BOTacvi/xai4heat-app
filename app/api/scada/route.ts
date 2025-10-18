import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lamela = searchParams.get("lamela");

  if (!lamela) {
    return NextResponse.json({ error: "Missing lamela" }, { status: 400 });
  }

  const data = await prisma.scada_measurements.findMany({
    where: {
      location: {
        contains: lamela, // flexible if location = lamela_1 or something like that
      },
    },
    orderBy: {
      datetime: "desc",
    },
    take: 200,
  });

  return NextResponse.json(data);
}
