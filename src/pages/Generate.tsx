import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Box, Sparkles } from "lucide-react";

export default function Generate() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Sending to AI...");

  useEffect(() => {
    if (!sessionId) return;

    const generateModel = async () => {
      try {
        // Sequence of statuses for better UX
        setTimeout(() => setStatus("Analyzing image..."), 2000);
        setTimeout(() => setStatus("Estimating 3D geometry..."), 4000);
        setTimeout(() => setStatus("Generating 3D mesh..."), 6000);

        let res;
        let retries = 3;
        while (retries > 0) {
          try {
            res = await fetch(`/api/generate-single-image/${sessionId}`, {
              method: "POST",
            });
            break;
          } catch (err) {
            retries--;
            if (retries === 0) throw err;
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        if (res && res.ok) {
          setStatus("Model ready!");
          setTimeout(() => {
            navigate(`/qr/${sessionId}`);
          }, 1000);
        } else {
          alert("Failed to generate model.");
          navigate("/");
        }
      } catch (error) {
        console.error("Generation error", error);
        alert("Error generating model.");
        navigate("/");
      }
    };

    generateModel();
  }, [sessionId, navigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden"
    >
      <div className="absolute top-6 left-6 z-20">
        <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          <ChevronLeft size={24} className="text-white" />
        </button>
      </div>

      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"
      />

      <div className="w-full max-w-sm space-y-12 z-10 flex flex-col items-center">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-4 border-white/10 border-t-blue-500 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 border-4 border-white/10 border-b-purple-500 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="bg-white/10 p-4 rounded-full backdrop-blur-md"
          >
            <Box size={32} className="text-white" />
          </motion.div>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight flex items-center justify-center gap-2">
            <Sparkles className="text-blue-400" size={24} />
            AI Processing
          </h2>
          <div className="h-6 flex items-center justify-center">
            <motion.p 
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-blue-300 text-sm font-medium tracking-wide"
            >
              {status}
            </motion.p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
