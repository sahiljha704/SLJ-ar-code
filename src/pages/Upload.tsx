import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Upload, Loader2, Package } from "lucide-react";

export default function UploadModel() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = ['.glb', '.gltf'];
    const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    
    if (validTypes.includes(extension)) {
      setFile(selectedFile);
      
      // Save to localStorage for ?view=1 mode
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const base64 = e.target?.result as string;
          localStorage.setItem("slj_model", base64);
          localStorage.setItem("slj_model_name", selectedFile.name);
        } catch (err) {
          console.warn("Could not save to localStorage (might be too large)", err);
        }
      };
      reader.readAsDataURL(selectedFile);
    } else {
      alert("Please upload a valid .glb or .gltf file.");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // 1. Create a new session
      const sessionRes = await fetch("/api/sessions", { method: "POST" });
      const sessionData = await sessionRes.json();
      const sessionId = sessionData.sessionId;
      
      setUploadProgress(30);

      // 2. Upload the model file
      const formData = new FormData();
      formData.append("model", file);

      const uploadRes = await fetch(`/api/upload-model/${sessionId}`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload model");
      }

      setUploadProgress(100);
      
      // 3. Navigate to QR page
      setTimeout(() => {
        navigate(`/qr/${sessionId}`);
      }, 500);

    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload model. Please try again.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col p-6 bg-black h-full"
    >
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-medium">Upload 3D Model</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Got your own model?</h2>
          <p className="text-gray-400 max-w-xs mx-auto">
            Upload a .glb or .gltf file to view it in AR instantly.
          </p>
        </div>

        <motion.div
          animate={{ scale: isDragging ? 1.02 : 1 }}
          className={`w-full max-w-sm aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-8 transition-colors cursor-pointer ${
            isDragging ? "border-white bg-white/10" : "border-white/20 bg-white/5 hover:bg-white/10"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".glb,.gltf"
            className="hidden"
          />
          
          {file ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Package size={32} className="text-white" />
              </div>
              <div>
                <p className="font-medium text-white truncate max-w-[200px]">{file.name}</p>
                <p className="text-sm text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-sm text-red-400 hover:text-red-300 mt-2"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-2">
                <Upload size={28} className="text-white/70" />
              </div>
              <div>
                <p className="font-medium text-white text-lg">Drop your .glb model here</p>
                <p className="text-sm text-gray-400 mt-1">or tap to browse</p>
              </div>
            </div>
          )}
        </motion.div>

        {isUploading && (
          <div className="w-full max-w-sm space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleUpload}
          disabled={!file || isUploading}
          className={`w-full py-4 rounded-2xl font-medium text-lg flex items-center justify-center space-x-2 shadow-xl transition-colors ${
            !file || isUploading 
              ? "bg-white/20 text-white/50 cursor-not-allowed" 
              : "bg-white text-black hover:bg-gray-200"
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <span>Generate AR Code</span>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
