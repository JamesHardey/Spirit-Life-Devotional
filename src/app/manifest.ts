import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SpiritLife Daily Devotional",
    short_name: "SpiritLife",
    description:
      "Daily devotionals from The Spirit Life C. & S. Church — read each day and keep your streak.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0F0A1E",
    theme_color: "#0F0A1E",
    categories: ["lifestyle", "education"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
