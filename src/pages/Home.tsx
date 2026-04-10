import { motion, Variants } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Box, Camera, QrCode, History } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Home() {
  const navigate = useNavigate();

  const handleStart = async () => {
    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      const data = await res.json();
      if (data.sessionId) {
        navigate(`/scan?sessionId=${data.sessionId}`);
      }
    } catch (error) {
      console.error("Failed to create session", error);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit={{ opacity: 0 }}
      variants={containerVariants}
      className="flex-1 flex flex-col p-6 overflow-y-auto relative"
    >
      {/* Video Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          src="https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-connection-background-27898-large.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/80 to-black" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center space-y-8 mt-12">
        <motion.div
          animate={{ rotateY: [0, 15, -15, 0], rotateX: [0, -10, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          style={{ perspective: 1000 }}
        >
          <motion.div
            variants={itemVariants}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
          >
            <span className="text-black font-bold text-3xl tracking-tighter">SLJ</span>
          </motion.div>
        </motion.div>

        <div className="space-y-4">
          <motion.h1
            variants={itemVariants}
            className="text-4xl font-semibold tracking-tight leading-tight"
          >
            Scan Reality. <br /> Turn It Into AR.
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-gray-400 text-lg max-w-xs mx-auto"
          >
            Capture real-world objects and experience them in augmented reality using a simple QR code.
          </motion.p>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        className="relative z-10 space-y-8 mb-8 mt-12"
      >
        <div className="space-y-6">
          <motion.div variants={itemVariants} className="flex items-center space-x-4 text-gray-300 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Camera size={20} className="text-white" />
            </div>
            <p className="text-sm font-medium">1. Take 1 clear photo of the object</p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="flex items-center space-x-4 text-gray-300 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Box size={20} className="text-white" />
            </div>
            <p className="text-sm font-medium">2. AI generates 3D model automatically</p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="flex items-center space-x-4 text-gray-300 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <QrCode size={20} className="text-white" />
            </div>
            <p className="text-sm font-medium">3. Scan QR to view in real-world AR</p>
          </motion.div>
        </div>

        <div className="flex flex-col space-y-4">
          <div className="flex space-x-4">
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStart}
              className="flex-1 bg-white text-black py-4 rounded-2xl font-medium text-lg hover:bg-gray-200 transition-colors shadow-xl"
            >
              Start Scanning
            </motion.button>
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/history")}
              className="w-16 bg-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
            >
              <History size={24} />
            </motion.button>
          </div>
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/upload")}
            className="w-full bg-white/10 text-white py-4 rounded-2xl font-medium text-lg hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10 flex items-center justify-center space-x-2"
          >
            <Box size={20} />
            <span>Upload 3D Model</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
