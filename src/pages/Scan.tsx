import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import Webcam from "react-webcam";
import { ChevronLeft, Loader2, Flashlight, FlashlightOff } from "lucide-react";

const MIN_IMAGES = 1;
const MAX_IMAGES = 1;

export default function Scan() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const capture = useCallback(() => {
    if (images.length >= MAX_IMAGES) return;
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImages((prev) => [...prev, imageSrc]);
    }
  }, [images.length]);

  const toggleTorch = async () => {
    try {
      const stream = webcamRef.current?.video?.srcObject as MediaStream;
      if (!stream) return;
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !isTorchOn }]
          } as any);
          setIsTorchOn(!isTorchOn);
        } else {
          alert("Flashlight is not supported on this device or browser.");
        }
      }
    } catch (err) {
      console.error("Error toggling torch", err);
      alert("Unable to access flashlight.");
    }
  };

  const handleGenerate = async () => {
    if (images.length < MIN_IMAGES || !sessionId) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      
      for (let i = 0; i < images.length; i++) {
        const res = await fetch(images[i]);
        const blob = await res.blob();
        formData.append("images", blob, `image-${i}.jpg`);
      }

      const uploadRes = await fetch(`/api/upload/${sessionId}`, {
        method: "POST",
        body: formData,
      });

      if (uploadRes.ok) {
        navigate(`/generate/${sessionId}`);
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col bg-black relative"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-medium">
          {images.length} / {MAX_IMAGES}
        </div>
        <button onClick={toggleTorch} className="p-2 bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors">
          {isTorchOn ? <Flashlight size={24} className="text-yellow-400" /> : <FlashlightOff size={24} />}
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden bg-zinc-900 rounded-b-3xl">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode }}
          onUserMediaError={() => {
            if (facingMode === "environment") {
              setFacingMode("user"); // Fallback for PC without rear camera
            }
          }}
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Guidance Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <motion.div 
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-64 h-64 border-2 border-white/30 rounded-3xl relative"
          >
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-3xl"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-3xl"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-3xl"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-3xl"></div>
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
          <motion.p 
            key={images.length < MIN_IMAGES ? "need-more" : "ready"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white/90 text-sm font-medium bg-black/50 inline-block px-5 py-2.5 rounded-full backdrop-blur-md shadow-lg"
          >
            {images.length < MIN_IMAGES 
              ? `Capture 1 clear photo of the object`
              : "Ready to generate!"}
          </motion.p>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 pb-10 space-y-6 bg-black">
        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={capture}
            disabled={images.length >= MAX_IMAGES || isUploading}
            className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center p-1 disabled:opacity-50 relative group"
          >
            <div className="w-full h-full bg-white rounded-full group-active:bg-gray-300 transition-colors"></div>
          </motion.button>
        </div>

        <AnimatePresence>
          {images.length >= MIN_IMAGES && (
            <motion.button
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 20, height: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGenerate}
              disabled={isUploading}
              className="w-full bg-white text-black py-4 rounded-2xl font-medium text-lg flex items-center justify-center space-x-2 disabled:opacity-70 shadow-xl overflow-hidden"
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Uploading...</span>
                </>
              ) : (
                <span>Generate 3D Model</span>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
