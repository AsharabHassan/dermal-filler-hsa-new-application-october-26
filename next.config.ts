import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phones/other devices on the LAN to load the Next.js dev resources
  // (/_next/* chunks + HMR) when hitting the dev server by LAN IP. Without this,
  // Next 16 blocks those as cross-origin and the client JS never runs — the page
  // renders only its background and all motion content stays at opacity:0.
  allowedDevOrigins: ["192.168.0.101", "192.168.0.102", "192.168.0.103", "192.168.0.176"],
};

export default nextConfig;
