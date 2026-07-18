"use client";

import { motion } from "framer-motion";

/** First paint: animated logo + real asset-download progress. */
export function LoadingScreen({ progress = 0 }: { progress?: number }) {
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
        <motion.img
          src="/web-app-manifest-512x512.png"
          alt="Freedom Fly logo"
          width={64}
          height={64}
          className="h-16 w-16 rounded-xl"
          animate={{ y: [0, -10, 0], rotate: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <h1 className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-4xl font-black tracking-tight text-transparent">
          FREEDOM FLY
        </h1>
      </motion.div>

      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-400"
          initial={{ width: "0%" }}
          animate={{ width: `${Math.max(4, progress)}%` }}
          transition={{ ease: "easeOut", duration: 0.3 }}
        />
      </div>
      <p className="text-sm tracking-widest text-white/40">
        LOADING… {Math.round(progress)}%
      </p>
    </motion.div>
  );
}
