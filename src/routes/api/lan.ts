import { createFileRoute } from "@tanstack/react-router";
import os from "node:os";

export const Route = createFileRoute("/api/lan")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:8080";
        const proto = request.headers.get("x-forwarded-proto") ?? "http";
        const nets = os.networkInterfaces();
        const hamachi: string[] = [];
        const urls: string[] = [];
        for (const addrs of Object.values(nets)) {
          for (const a of addrs ?? []) {
            if (a.internal) continue;
            if (a.family !== "IPv4" && a.family !== 4) continue;
            if (a.address.startsWith("169.254.")) continue;
            const url = `http://${a.address}:8080`;
            if (a.address.startsWith("25.")) hamachi.push(url);
            else urls.push(url);
          }
        }
        return Response.json({
          origin: `${proto}://${host}`,
          hamachi,
          urls: [...hamachi, ...urls],
        });
      },
    },
  },
});
