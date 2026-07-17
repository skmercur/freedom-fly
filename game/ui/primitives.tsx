"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { audio } from "@/lib/audio";

/** Frosted-glass container used by every menu panel. */
export function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/40 backdrop-blur-2xl ${className}`}
    >
      {children}
    </div>
  );
}

type Variant = "primary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-teal-400 to-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/30 hover:from-teal-300 hover:to-cyan-400",
  ghost:
    "bg-white/5 text-white/90 border border-white/15 hover:bg-white/10",
  danger:
    "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/30 hover:from-rose-400 hover:to-red-400",
};

/** Animated button that plays a click SFX. */
export function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      onClick={() => {
        if (disabled) return;
        audio().click();
        onClick?.();
      }}
      className={`rounded-2xl px-6 py-3 text-base font-semibold tracking-wide transition-colors disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}
