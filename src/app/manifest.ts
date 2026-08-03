import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QuickCart Food & Grocery",
    short_name: "QuickCart",
    description: "Food and grocery delivery platform",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8f4",
    theme_color: "#0b4f3c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
