"use client";

import { motion } from "framer-motion";

/** First paint: animated logo + indeterminate progress bar. */
export function LoadingScreen() {
  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-8 bg-[#05060f]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="flex items-center gap-3"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.span
          className="text-5xl"
          animate={{ y: [0, -10, 0], rotate: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          🕊️
        </motion.span>
        <h1 className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-4xl font-black tracking-tight text-transparent">
          FREEDOM FLY
        </h1>
      </motion.div>

      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full w-1/3 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <p className="text-sm tracking-widest text-white/40">LOADING…</p>
    </motion.div>
  );
}
