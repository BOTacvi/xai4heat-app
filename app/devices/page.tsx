import { prisma } from "@/lib/prisma";

export default async function DevicesPage() {
  // fetch all devices
  const devices = await prisma.device.findMany();

  return (
    <div>
      <h1>Devices</h1>
      <ul>
        {devices?.map((device) => (
          <li key={device.device_id}>{device.name}</li>
        ))}
      </ul>
    </div>
  );
}
