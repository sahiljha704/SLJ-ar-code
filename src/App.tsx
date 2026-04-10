/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Home from "./pages/Home";
import Scan from "./pages/Scan";
import Generate from "./pages/Generate";
import QR from "./pages/QR";
import AR from "./pages/AR";
import History from "./pages/History";
import UploadModel from "./pages/Upload";
import Layout from "./components/Layout";

function InitialLoader({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden"
      exit={{ opacity: 0, scale: 1.2, filter: "blur(20px)" }}
      transition={{ duration: 1, ease: "easeInOut" }}
    >
      <div className="relative w-40 h-40" style={{ perspective: 1000 }}>
        <motion.div
          className="absolute inset-0 border-4 border-white/20 rounded-2xl"
          animate={{ rotateX: 360, rotateY: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-4 border-4 border-white/50 rounded-full"
          animate={{ rotateX: -360, rotateY: 180 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-8 border-4 border-white rounded-xl flex items-center justify-center bg-black/50 backdrop-blur-sm"
          animate={{ rotateX: 180, rotateY: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        >
          <motion.span 
            animate={{ rotateX: -180, rotateY: 360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="text-white font-bold text-2xl tracking-tighter"
          >
            SLJ
          </motion.span>
        </motion.div>
      </div>
      <motion.div
        className="mt-12 space-y-2 text-center"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <h1 className="text-white text-2xl font-bold tracking-[0.3em]">INITIALIZING</h1>
        <p className="text-white/50 text-sm tracking-widest">AR ENGINE v2.0</p>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);

  return (
    <Router>
      <AnimatePresence mode="wait">
        {loading ? (
          <InitialLoader key="loader" onComplete={() => setLoading(false)} />
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="h-screen w-full flex flex-col bg-black text-white"
          >
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="scan" element={<Scan />} />
                <Route path="generate/:sessionId" element={<Generate />} />
                <Route path="qr/:sessionId" element={<QR />} />
                <Route path="ar" element={<AR />} />
                <Route path="history" element={<History />} />
                <Route path="upload" element={<UploadModel />} />
              </Route>
            </Routes>
          </motion.div>
        )}
      </AnimatePresence>
    </Router>
  );
}
