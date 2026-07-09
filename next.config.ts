import type { NextConfig } from "next";

// GitHub Pages serves this as a project site at
// https://<user>.github.io/our-gaze/, not the domain root, so production
// builds need every asset URL prefixed with the repo name. Dev stays at
// root so `npm run dev` / the tunnel setup keep working unchanged.
const isProd = process.env.NODE_ENV === "production";
const BASE_PATH = isProd ? "/our-gaze" : "";

const nextConfig: NextConfig = {
  // GitHub Pages only serves static files — no Node server for SSR/ISR/
  // image-optimization endpoints, so the whole app is exported to static
  // HTML/CSS/JS at build time.
  output: "export",
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  images: {
    // The default next/image loader needs a running Next.js server to
    // resize/optimize on demand, which a static host doesn't have.
    unoptimized: true,
  },
  env: {
    // Lets plain (non-next/image) asset URLs — e.g. CSS background-image —
    // pick up the same prefix, since only next/image and next/link do this
    // automatically.
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
  // Next.js blocks cross-origin requests to dev-only assets/endpoints by
  // default. Sharing the dev server through a cloudflared quick tunnel
  // (random *.trycloudflare.com subdomain each run) needs this allow-listed,
  // or asset fetches issued by client JS (e.g. the physics engine's WASM
  // binary) get silently rejected while top-level navigation still works —
  // producing a page that loads but renders nothing.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
