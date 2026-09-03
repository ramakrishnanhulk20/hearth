import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Hearth, confidential no-loss prize savings on the Zama Protocol";

/**
 * The social card. Same three elements as the site: near-black ground, the flame accent, and the
 * hearth mark, so a link preview reads as the same product as the page it opens.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "radial-gradient(60% 70% at 78% 30%, #241d05 0%, #050505 62%)",
          padding: "72px 80px",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="46" height="46" viewBox="0 0 24 24">
            <path
              d="M4 21V9.5A5.5 5.5 0 0 1 9.5 4h5A5.5 5.5 0 0 1 20 9.5V21"
              fill="none"
              stroke="#F9D100"
              strokeOpacity="0.8"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M2.6 21h18.8" stroke="#F9D100" strokeOpacity="0.8" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 10.2c1.9 1.3 2.8 2.6 2.8 4a2.8 2.8 0 0 1-5.6 0c0-1.4.9-2.7 2.8-4z" fill="#F9D100" />
          </svg>
          <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Hearth</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 86, fontWeight: 800, letterSpacing: -3.5, lineHeight: 1, maxWidth: 900 }}>
            Save together. Nobody sees how much.
          </div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.6)", maxWidth: 880, lineHeight: 1.35 }}>
            Confidential no-loss prize savings on the Zama Protocol.
          </div>
        </div>

        <div style={{ display: "flex", gap: 34, fontSize: 22, color: "rgba(255,255,255,0.45)" }}>
          <span>Balances encrypted on chain</span>
          <span style={{ color: "#F9D100" }}>·</span>
          <span>Odds by time-weighted balance</span>
          <span style={{ color: "#F9D100" }}>·</span>
          <span>Principal never locked</span>
        </div>
      </div>
    ),
    size,
  );
}
