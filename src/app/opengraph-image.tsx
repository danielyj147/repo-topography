import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Repo Topography — See the shape of any codebase";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Terrain silhouette */}
        <svg
          width="800"
          height="200"
          viewBox="0 0 800 200"
          style={{ position: "absolute", bottom: 100, opacity: 0.15 }}
        >
          <defs>
            <linearGradient id="tg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>
          <path
            d="M0 200 L50 140 L120 160 L180 80 L250 130 L320 60 L400 40 L480 70 L540 30 L620 90 L680 50 L740 120 L800 200Z"
            fill="url(#tg)"
          />
        </svg>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "white",
              display: "flex",
              letterSpacing: "-2px",
            }}
          >
            Repo
            <span
              style={{
                background: "linear-gradient(90deg, #818cf8, #a78bfa)",
                backgroundClip: "text",
                color: "transparent",
                marginLeft: 12,
              }}
            >
              Topography
            </span>
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#9ca3af",
              fontWeight: 300,
              maxWidth: 600,
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            See the shape of any codebase as interactive 3D terrain
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
