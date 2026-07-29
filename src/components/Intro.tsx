"use client";

import { useEffect, useState } from "react";

// Full-screen branded splash: the big "M" icon fades + scales in, then a
// little taxi drives across pulling the loading bar behind it, and the
// screen lifts away to reveal the app. Plays on each full load. Tap to skip.
export function Intro() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDone(true), 3200);
    return () => clearTimeout(t);
  }, []);

  if (done) return null;

  return (
    <div
      className="intro-root fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-white"
      onClick={() => setDone(true)}
      role="presentation"
    >
      {/* soft brand glow behind the icon */}
      <div
        className="intro-glow pointer-events-none absolute h-80 w-80 rounded-full bg-gradient-to-tr from-blue-500/30 to-cyan-300/30 blur-3xl"
        aria-hidden
      />

      {/* big M icon */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/milescraft-m.png"
        alt="Milescraft"
        className="intro-logo relative w-56 max-w-[64%] drop-shadow-xl"
      />

      {/* car pulling the loading bar */}
      <div className="relative mt-12 h-9 w-64 max-w-[72%]">
        {/* track */}
        <div className="absolute left-0 top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-slate-200" />
        {/* fill — the bar being dragged along */}
        <div className="intro-fill absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" />
        {/* the taxi (flipped to face the way it drives) */}
        <div className="intro-car absolute left-0 top-1/2 text-3xl" aria-hidden>
          🚕
        </div>
      </div>
    </div>
  );
}
