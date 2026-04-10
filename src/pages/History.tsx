import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Trash2, Box } from "lucide-react";

interface HistoryItem {
  sessionId: string;
  date: string;
  modelUrl: string;
}

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("qr_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Sort by date descending
        parsed.sort((a: HistoryItem, b: HistoryItem) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistory(parsed);
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear all history?")) {
      localStorage.removeItem("qr_history");
      setHistory([]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col p-6 bg-black relative overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          <ChevronLeft size={24} className="text-white" />
        </button>
        <h2 className="text-xl font-semibold text-white">History</h2>
        {history.length > 0 ? (
          <button onClick={clearHistory} className="p-2 bg-red-500/10 text-red-400 rounded-full hover:bg-red-500/20 transition-colors">
            <Trash2 size={20} />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
          <Box size={48} className="opacity-20" />
          <p>No generated models yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {history.map((item) => (
            <motion.div
              key={item.sessionId}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/qr/${item.sessionId}`)}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3 cursor-pointer"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Box size={24} className="text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-white text-sm font-medium truncate w-24">
                  {item.sessionId.split('-')[0]}
                </p>
                <p className="text-gray-500 text-xs">
                  {new Date(item.date).toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
