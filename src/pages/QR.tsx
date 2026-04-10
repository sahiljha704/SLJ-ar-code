import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ChevronLeft, Download, ScanLine, Loader2, Link, Share } from "lucide-react";

export default function QR() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        const data = await res.json();
        if (data.session && data.session.model_url) {
          setModelUrl(data.session.model_url);
          
          // Save to history
          const history = JSON.parse(localStorage.getItem("qr_history") || "[]");
          if (!history.find((h: any) => h.sessionId === sessionId)) {
            history.push({
              sessionId,
              date: new Date().toISOString(),
              modelUrl: data.session.model_url
            });
            localStorage.setItem("qr_history", JSON.stringify(history));
          }
        }
      } catch (error) {
        console.error("Failed to fetch session", error);
      }
    };
    
    // Simulate staged loading for QR generation
    const timer1 = setTimeout(() => setLoadingStep(1), 800);
    const timer2 = setTimeout(() => setLoadingStep(2), 1600);
    const timer3 = setTimeout(() => {
      setLoadingStep(3);
      fetchSession();
    }, 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [sessionId]);

  const loadingTexts = [
    "Generating QR...",
    "Embedding AR link...",
    "Finalizing...",
    "Ready!"
  ];

  if (!modelUrl || loadingStep < 3) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col items-center justify-center p-6 bg-black"
      >
        <Loader2 className="animate-spin text-white mb-6" size={40} />
        <motion.p
          key={loadingStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white/80 font-medium text-lg"
        >
          {loadingTexts[loadingStep]}
        </motion.p>
      </motion.div>
    );
  }

  const handleSaveQR = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Fill white background
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `AR-QR-${sessionId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  // Ensure the URL is globally unique by appending the UUID sessionId
  // Also add ?view=1 for the direct localStorage viewer mode
  const arUrl = `${window.location.origin}/ar?view=1&model=${encodeURIComponent(modelUrl)}&id=${sessionId}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'View my 3D model in AR',
          text: 'Check out this 3D model in Augmented Reality!',
          url: arUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
        fallbackCopy();
      }
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    navigator.clipboard.writeText(arUrl);
    const toast = document.createElement('div');
    toast.textContent = 'Link Copied!';
    toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-2 rounded-full font-medium text-sm z-50 animate-bounce';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col p-6 bg-black"
    >
      <div className="flex items-center justify-between mb-12">
        <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-medium">Your AR Code</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="bg-white p-6 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.15)] relative"
        >
          <QRCodeSVG
            id="qr-code-svg"
            value={arUrl}
            size={240}
            level="H"
            includeMargin={false}
            fgColor="#000000"
            bgColor="#ffffff"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white border-2 border-black rounded-[6px] w-[88px] h-[30px] flex items-center justify-center shadow-sm">
              <span className="text-black font-bold text-[15px]" style={{ fontFamily: "'Space Mono', monospace" }}>SLJ</span>
            </div>
          </div>
        </motion.div>

        <div className="text-center space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight">Ready to View</h2>
          <p className="text-gray-400 max-w-xs mx-auto leading-relaxed">
            Scan this code with any smartphone camera to view your 3D model in augmented reality.
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-8 pb-6">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.open(arUrl, "_blank")}
          className="w-full bg-white text-black py-4 rounded-2xl font-medium text-lg flex items-center justify-center space-x-2 shadow-xl"
        >
          <ScanLine size={20} />
          <span>Open AR Viewer</span>
        </motion.button>
        <div className="flex space-x-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSaveQR}
            className="flex-1 bg-white/10 text-white py-4 rounded-2xl font-medium text-lg flex items-center justify-center space-x-2 hover:bg-white/20 transition-colors"
          >
            <Download size={20} />
            <span>Save QR</span>
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="flex-1 bg-white/10 text-white py-4 rounded-2xl font-medium text-lg flex items-center justify-center space-x-2 hover:bg-white/20 transition-colors"
          >
            <Share size={20} />
            <span>Share</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
