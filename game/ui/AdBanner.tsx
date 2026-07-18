"use client";

/**
 * A-ADS banner shown across the top of the screen (unit 2448347).
 *
 * Mounted once, unconditionally, from <GameUI> — so it loads on the very first
 * (loading) screen and its iframe is never torn down or reloaded as the game
 * moves between menu / flying / paused. The surrounding overlay is
 * `pointer-events-none`, so the banner opts pointer events back in for itself.
 */
export function AdBanner() {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-[99998] w-[80%] max-w-xl -translate-x-1/2">
      <iframe
        title="Sponsored"
        data-aa="2448347"
        src="//acceptable.a-ads.com/2448347/?size=Adaptive"
        style={{
          border: 0,
          padding: 0,
          width: "100%",
          height: "auto",
          overflow: "hidden",
          display: "block",
          margin: "auto",
        }}
      />
    </div>
  );
}
