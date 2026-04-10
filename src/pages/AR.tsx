import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ChevronLeft, View, Sun, SlidersHorizontal, X, Flashlight, FlashlightOff, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function AR() {
  const [searchParams] = useSearchParams();
  const isViewMode = searchParams.get("view") === "1";
  const [localModel, setLocalModel] = useState<string | null>(null);
  const modelUrl = isViewMode ? localModel : searchParams.get("model");
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  // Lighting controls state
  const [exposure, setExposure] = useState(1);
  const [shadowIntensity, setShadowIntensity] = useState(1.5);
  const [shadowSoftness, setShadowSoftness] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [isWebAR, setIsWebAR] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const reticleRef = useRef<THREE.Mesh | null>(null);
  const hitTestSourceRef = useRef<any>(null);
  const xrSessionRef = useRef<any>(null);
  const currentHitMatrixRef = useRef<Float32Array | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const [modelPlaced, setModelPlaced] = useState(false);

  useEffect(() => {
    if (isViewMode) {
      const storedModel = localStorage.getItem("slj_model");
      if (storedModel) {
        setLocalModel(storedModel);
      } else {
        setHasError(true);
        setErrorMessage("No model found. Please upload a .glb file first.");
      }
    }
  }, [isViewMode]);

  useEffect(() => {
    console.log("AR Page loaded with modelUrl:", modelUrl);
  }, [modelUrl]);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!modelUrl || !canvasRef.current) return;

    // FIX 1 — HTTPS CHECK
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      alert('AR requires HTTPS. Please open this from your GitHub Pages URL.');
      return;
    }

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: canvasRef.current });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.xr.enabled = true;
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, exposure);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, shadowIntensity);
    dirLight.position.set(5, 10, 2);
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // FIX 8 — ADD SHADOW UNDER THE MODEL
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 3),
      new THREE.ShadowMaterial({ opacity: 0.35, transparent: true })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 8;
    dirLight.shadow.camera.left = -1;
    dirLight.shadow.camera.right = 1;
    dirLight.shadow.camera.top = 1;
    dirLight.shadow.camera.bottom = -1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // FIX 4 — ADD RETICLE IF NOT ALREADY THERE
    const reticleGeo = new THREE.RingGeometry(0.1, 0.13, 32);
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.rotation.x = -Math.PI / 2;
    reticle.visible = false;
    scene.add(reticle);
    reticleRef.current = reticle;

    // Load Model
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;
        
        // FIX 7 — FIX MODEL BOTTOM SITTING ON SURFACE
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = 0.5 / maxDim;
        model.scale.setScalar(targetScale);

        // Re-compute box after scaling
        const scaledBox = new THREE.Box3().setFromObject(model);
        // Center horizontally, sit base on ground
        model.position.x = -center.x * targetScale;
        model.position.y = -scaledBox.min.y;
        model.position.z = -center.z * targetScale;

        model.visible = false; // Hidden until placed
        scene.add(model);

        // Enable shadows on all meshes
        model.traverse(node => {
          if ((node as THREE.Mesh).isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        setIsLoaded(true);
      },
      undefined,
      (error) => {
        console.error("Error loading model:", error);
        setHasError(true);
        setErrorMessage("Failed to load the 3D model.");
      }
    );

    // FIX 3 — REPLACE THE ANIMATION LOOP
    renderer.setAnimationLoop(onXRFrame);

    function onXRFrame(timestamp: number, frame: any) {
      if (!frame) return;

      const refSpace = renderer.xr.getReferenceSpace();

      if (!modelPlaced && hitTestSourceRef.current) {
        const hits = frame.getHitTestResults(hitTestSourceRef.current);
        if (hits.length > 0) {
          const pose = hits[0].getPose(refSpace);
          reticle.visible = true;
          const m = pose.transform.matrix;
          reticle.position.set(m[12], m[13], m[14]);
          reticle.rotation.x = -Math.PI / 2;
          currentHitMatrixRef.current = pose.transform.matrix;
        } else {
          reticle.visible = false;
          currentHitMatrixRef.current = null;
        }
      }

      renderer.render(scene, camera);
    }

    // Handle Resize
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize);

    return () => {
      window.removeEventListener('resize', onWindowResize);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      // FIX 12 — CLEAN UP SESSION ON EXIT
      setModelPlaced(false);
      currentHitMatrixRef.current = null;
      if (hitTestSourceRef.current) { hitTestSourceRef.current.cancel(); hitTestSourceRef.current = null; }
      if (xrSessionRef.current) { 
        try { xrSessionRef.current.end(); } catch(e) {} 
        xrSessionRef.current = null; 
      }
    };
  }, [modelUrl, modelPlaced]);

  // Update lighting when controls change
  useEffect(() => {
    if (sceneRef.current && dirLightRef.current) {
      sceneRef.current.traverse((child) => {
        if (child instanceof THREE.AmbientLight) {
          child.intensity = exposure;
        }
      });
      dirLightRef.current.intensity = shadowIntensity;
    }
  }, [exposure, shadowIntensity, shadowSoftness]);

  // FIX 11 — FIX GYRO FALLBACK
  useEffect(() => {
    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (!modelPlaced || !cameraRef.current || !modelRef.current) return;
      const beta = e.beta || 45;
      const alpha = e.alpha || 0;

      const phi = THREE.MathUtils.degToRad(alpha);
      const theta = THREE.MathUtils.degToRad(Math.max(10, Math.min(80, beta)));
      const radius = 1.5;

      const targetX = radius * Math.sin(theta) * Math.sin(phi);
      const targetY = radius * Math.cos(theta);
      const targetZ = radius * Math.sin(theta) * Math.cos(phi);

      cameraRef.current.position.x += (targetX - cameraRef.current.position.x) * 0.07;
      cameraRef.current.position.y += (targetY - cameraRef.current.position.y) * 0.07;
      cameraRef.current.position.z += (targetZ - cameraRef.current.position.z) * 0.07;
      cameraRef.current.lookAt(modelRef.current.position);
    };

    if (isWebAR && !xrSessionRef.current) {
      window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
    }

    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, [isWebAR, modelPlaced]);

  const startWebAR = async () => {
    try {
      // Try WebXR first
      if (navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')) {
        // FIX 2 — REPLACE THE WEBXR SESSION REQUEST
        const session = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test', 'local-floor'],
          optionalFeatures: ['dom-overlay', 'light-estimation'],
          domOverlay: { root: document.getElementById('ar-overlay') || document.body }
        });
        
        if (rendererRef.current) {
          rendererRef.current.xr.setReferenceSpaceType('local-floor');
          await rendererRef.current.xr.setSession(session);
        }
        
        xrSessionRef.current = session;
        setIsWebAR(true);

        // FIX 5 — FIX THE HIT TEST SOURCE CREATION
        const viewerSpace = await session.requestReferenceSpace('viewer');
        hitTestSourceRef.current = await session.requestHitTestSource({ space: viewerSpace });

        session.addEventListener('end', stopWebAR);
      } else {
        // Fallback to Gyro + Video
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsWebAR(true);
        // For gyro fallback, we just place the model in front of the camera immediately
        if (modelRef.current && cameraRef.current) {
          modelRef.current.position.set(0, -0.5, -1.5);
          modelRef.current.visible = true;
          setModelPlaced(true);
        }
      }
    } catch (err) {
      console.error("WebAR error:", err);
      alert("Could not start AR. Please check permissions.");
    }
  };

  const stopWebAR = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebAR(false);
    
    // FIX 12 — CLEAN UP SESSION ON EXIT
    setModelPlaced(false);
    currentHitMatrixRef.current = null;
    if (hitTestSourceRef.current) { hitTestSourceRef.current.cancel(); hitTestSourceRef.current = null; }
    if (rendererRef.current) rendererRef.current.setAnimationLoop(null);
    if (xrSessionRef.current) { 
      try { xrSessionRef.current.end(); } catch(e) {} 
      xrSessionRef.current = null; 
    }
    
    if (modelRef.current) modelRef.current.visible = false;
    if (reticleRef.current) reticleRef.current.visible = false;
  };

  useEffect(() => {
    return () => {
      stopWebAR();
    };
  }, []);

  const toggleFlashlight = async () => {
    try {
      if (!flashlightOn) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        const track = stream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(track);
        const photoCapabilities = await imageCapture.getPhotoCapabilities();
        
        // @ts-ignore
        if (photoCapabilities.fillLightMode && photoCapabilities.fillLightMode.includes('flash')) {
          // @ts-ignore
          await track.applyConstraints({ advanced: [{ torch: true }] });
          setFlashlightOn(true);
        } else {
          alert("Flashlight is not supported on this device's camera.");
        }
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        const track = stream.getVideoTracks()[0];
        // @ts-ignore
        await track.applyConstraints({ advanced: [{ torch: false }] });
        setFlashlightOn(false);
      }
    } catch (err) {
      console.error("Error toggling flashlight:", err);
      alert("Could not access flashlight. Please ensure camera permissions are granted.");
    }
  };

  // FIX 6 — FIX MODEL PLACEMENT ON TAP
  const handleTap = () => {
    if (modelPlaced || !currentHitMatrixRef.current || !modelRef.current || !reticleRef.current) return;

    const matrix = new THREE.Matrix4().fromArray(currentHitMatrixRef.current);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);

    modelRef.current.position.copy(position);
    modelRef.current.quaternion.copy(quaternion);

    // Lift model so its bottom sits ON the surface not inside it
    const box = new THREE.Box3().setFromObject(modelRef.current);
    modelRef.current.position.y += -box.min.y * modelRef.current.scale.x;

    modelRef.current.visible = true;
    reticleRef.current.visible = false;

    if (hitTestSourceRef.current) {
      hitTestSourceRef.current.cancel();
      hitTestSourceRef.current = null;
    }

    setModelPlaced(true);
  };

  if (!modelUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black p-6 text-center">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <p className="text-white mb-6">No model specified.</p>
        <button onClick={() => navigate("/")} className="bg-white text-black px-6 py-3 rounded-full font-medium">
          Go Back Home
        </button>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black p-6 text-center">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-semibold text-white mb-2">Oops! Something went wrong</h2>
        <p className="text-gray-400 mb-8">{errorMessage}</p>
        <button onClick={() => window.location.reload()} className="bg-white text-black px-6 py-3 rounded-full font-medium mb-4 w-full max-w-xs">
          Try Again
        </button>
        <button onClick={() => navigate("/")} className="bg-white/10 text-white px-6 py-3 rounded-full font-medium w-full max-w-xs">
          Go Back Home
        </button>
      </div>
    );
  }

  return (
    <div id="ar-overlay" className="flex-1 relative bg-gradient-to-b from-zinc-800 to-black h-screen w-full overflow-hidden" onClick={handleTap}>
      {/* Web AR Video Background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isWebAR && !xrSessionRef.current ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}
      />

      {/* Three.js Canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full z-10 ${isWebAR ? 'pointer-events-none' : ''}`}
      />

      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)} 
        className="absolute top-6 left-6 z-20 p-3 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black/70 transition-colors"
      >
        <ChevronLeft size={24} />
      </button>

      {/* Controls Toggle */}
      <div className="absolute top-6 right-6 z-20 flex flex-col space-y-4">
        <button
          onClick={(e) => { e.stopPropagation(); setShowControls(true); }}
          className="p-3 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black/70 transition-colors"
        >
          <SlidersHorizontal size={20} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFlashlight(); }}
          className={`p-3 rounded-full backdrop-blur-md transition-colors ${flashlightOn ? 'bg-yellow-400 text-black' : 'bg-black/50 text-white hover:bg-black/70'}`}
          title="Toggle Flashlight"
        >
          {flashlightOn ? <Flashlight size={20} /> : <FlashlightOff size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl p-6 rounded-t-3xl z-30 border-t border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Sun size={18} /> Lighting Controls
              </h3>
              <button onClick={() => setShowControls(false)} className="text-white/70 hover:text-white p-1 bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6 mb-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-white/80 font-medium">
                  <span>Exposure (Brightness)</span>
                  <span>{exposure.toFixed(1)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" max="3" step="0.1" 
                  value={exposure} 
                  onChange={(e) => setExposure(parseFloat(e.target.value))}
                  className="w-full accent-white h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-white/80 font-medium">
                  <span>Shadow Intensity</span>
                  <span>{shadowIntensity.toFixed(1)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="2" step="0.1" 
                  value={shadowIntensity} 
                  onChange={(e) => setShadowIntensity(parseFloat(e.target.value))}
                  className="w-full accent-white h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-white/80 font-medium">
                  <span>Shadow Softness</span>
                  <span>{shadowSoftness.toFixed(1)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="2" step="0.1" 
                  value={shadowSoftness} 
                  onChange={(e) => setShadowSoftness(parseFloat(e.target.value))}
                  className="w-full accent-white h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-20"
          >
            <motion.div
              animate={{ 
                rotateY: [0, 360],
                rotateX: [0, 360]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
              className="w-24 h-24 border-4 border-white/20 border-t-white border-r-white rounded-xl mb-8"
              style={{ transformStyle: "preserve-3d" }}
            />
            <motion.h2 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-2xl font-bold text-white mb-2 tracking-widest"
            >
              LOADING MODEL
            </motion.h2>
            <p className="text-white/50 font-medium">Preparing 3D environment...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom AR Buttons */}
      {!isWebAR ? (
        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center space-y-4 z-50 px-6">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); startWebAR(); }}
            className="w-full max-w-sm bg-white text-black border border-white/20 px-8 py-4 rounded-full font-medium text-lg backdrop-blur-md flex items-center justify-center space-x-2 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
          >
            <Camera size={20} />
            <span>Start AR Experience</span>
          </motion.button>
        </div>
      ) : (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); stopWebAR(); }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-8 py-4 rounded-full font-medium text-lg shadow-xl z-50 flex items-center space-x-2"
        >
          <X size={20} />
          <span>Exit Web AR</span>
        </motion.button>
      )}
    </div>
  );
}
