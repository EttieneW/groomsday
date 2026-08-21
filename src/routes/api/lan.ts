import { createFileRoute } from "@tanstack/react-router";
import os from "node:os";

export const Route = createFileRoute("/api/lan")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:8080";
        const proto = request.headers.get("x-forwarded-proto") ?? "http";
        const nets = os.networkInterfaces();
        const urls: string[] = [];
        for (const addrs of Object.values(nets)) {
          for (const a of addrs ?? []) {
            if (a.internal) continue;
            if (a.family !== "IPv4") continue;
            urls.push(`http://${a.address}:8080`);
          }
        }
        return Response.json({
          origin: `${proto}://${host}`,
          urls,
        });
      },
    },
  },
});
