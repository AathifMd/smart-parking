import { useEffect, useRef, useState, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { Smartphone, Monitor, Wifi, AlertCircle } from 'lucide-react';

interface WebcamDetectionProps {
  onDetectionChange: (slots: { id: number; isOccupied: boolean }[]) => void;
  isActive: boolean;
}

type CameraMode = 'webcam' | 'ipcam';

export function WebcamDetection({ onDetectionChange, isActive }: WebcamDetectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [carDetected, setCarDetected] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('ipcam');
  const [ipCamUrl, setIpCamUrl] = useState('http://192.168.29.80:4747/video');
  const [ipCamInputVal, setIpCamInputVal] = useState('http://192.168.29.80:4747/video');
  const [ipCamError, setIpCamError] = useState(false);
  const [freeSlotsCount, setFreeSlotsCount] = useState(6);

  const detectionIntervalRef = useRef<number | null>(null);

  // ─── Load TensorFlow model ──────────────────────────────────────────────────
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsModelLoading(true);
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
        setModelError(null);
      } catch (err) {
        console.error('Error loading model:', err);
        setModelError('Failed to load AI model. Check your internet connection.');
      } finally {
        setIsModelLoading(false);
      }
    };
    loadModel();
  }, []);

  // ─── Webcam stream setup/teardown ───────────────────────────────────────────
  useEffect(() => {
    if (cameraMode !== 'webcam') return;

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
      }
    };

    if (isActive) {
      startWebcam();
    } else {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [isActive, cameraMode]);

  // ─── Detection loop ─────────────────────────────────────────────────────────
  const runDetection = useCallback(async () => {
    if (!model || !canvasRef.current || !isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Choose source depending on mode
    let source: HTMLVideoElement | HTMLImageElement | null = null;
    if (cameraMode === 'webcam') {
      const video = videoRef.current;
      if (!video || video.readyState !== 4) return;
      source = video;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    } else {
      const img = imgRef.current;
      if (!img || !img.complete || img.naturalWidth === 0) return;
      source = img;
      canvas.width = img.naturalWidth || img.clientWidth || 640;
      canvas.height = img.naturalHeight || img.clientHeight || 480;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Run detection
    let predictions: cocoSsd.DetectedObject[] = [];
    try {
      // For img element we draw it to an offscreen canvas first
      if (cameraMode === 'ipcam') {
        const oc = offscreenCanvasRef.current;
        oc.width = canvas.width;
        oc.height = canvas.height;
        const octx = oc.getContext('2d')!;
        octx.drawImage(source as HTMLImageElement, 0, 0, oc.width, oc.height);
        predictions = await model.detect(oc);
      } else {
        predictions = await model.detect(source as HTMLVideoElement);
      }
    } catch (e) {
      console.warn('Detection error:', e);
      return;
    }

    const vW = canvas.width;
    const vH = canvas.height;
    const slotW = vW * 0.2;
    const slotH = vH * 0.35;
    const colX = [vW * 0.1, vW * 0.4, vW * 0.7];
    const rowY = [vH * 0.15, vH * 0.55];

    const parkingSlots = [
      { id: 1, x: colX[0], y: rowY[0], w: slotW, h: slotH },
      { id: 2, x: colX[1], y: rowY[0], w: slotW, h: slotH },
      { id: 3, x: colX[2], y: rowY[0], w: slotW, h: slotH },
      { id: 4, x: colX[0], y: rowY[1], w: slotW, h: slotH },
      { id: 5, x: colX[1], y: rowY[1], w: slotW, h: slotH },
      { id: 6, x: colX[2], y: rowY[1], w: slotW, h: slotH },
    ];

    const slotOccupancy = parkingSlots.map(slot => ({ ...slot, isOccupied: false }));

    const validClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
    const detectedVehicles = predictions.filter(
      p => validClasses.includes(p.class) && p.score > 0.45
    );

    // Mark slots
    detectedVehicles.forEach(vehicle => {
      const [vx, vy, vw, vh] = vehicle.bbox;
      const vCenterX = vx + vw / 2;
      const vCenterY = vy + vh / 2;
      slotOccupancy.forEach(slot => {
        if (
          vCenterX >= slot.x && vCenterX <= slot.x + slot.w &&
          vCenterY >= slot.y && vCenterY <= slot.y + slot.h
        ) {
          slot.isOccupied = true;
        }
      });
    });

    const anyCarFound = slotOccupancy.some(s => s.isOccupied);
    const freeCount = slotOccupancy.filter(s => !s.isOccupied).length;
    setCarDetected(anyCarFound);
    setFreeSlotsCount(freeCount);
    onDetectionChange(slotOccupancy.map(s => ({ id: s.id, isOccupied: s.isOccupied })));

    // ── Draw overlay ──
    // Free count
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(6, 6, 170, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(`Free: ${freeCount} / 6`, 14, 38);

    // Slot boxes
    slotOccupancy.forEach(slot => {
      const color = slot.isOccupied ? '#ef4444' : '#10b981';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);

      // Label background
      ctx.fillStyle = color;
      const label = `S${slot.id}: ${slot.isOccupied ? 'Occupied' : 'Free'}`;
      const textW = ctx.measureText(label).width + 10;
      ctx.fillRect(slot.x, slot.y - 26, textW, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(label, slot.x + 5, slot.y - 8);
    });

    // Detected vehicle boxes
    detectedVehicles.forEach(v => {
      const [vx, vy, vw, vh] = v.bbox;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.strokeRect(vx, vy, vw, vh);
      ctx.fillStyle = '#facc15';
      ctx.font = '13px Arial';
      ctx.fillText(`${v.class} (${Math.round(v.score * 100)}%)`, vx, vy - 5);
    });
  }, [model, isActive, cameraMode, onDetectionChange]);

  useEffect(() => {
    if (model && isActive) {
      detectionIntervalRef.current = window.setInterval(runDetection, 1500);
    }
    return () => {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    };
  }, [model, isActive, runDetection]);

  if (!isActive) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">AI Detection</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-3 h-3 rounded-full animate-pulse ${carDetected ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium text-gray-600">
              {isModelLoading
                ? 'Loading AI model…'
                : modelError
                ? 'Model error'
                : carDetected
                ? `Vehicle detected · ${freeSlotsCount}/6 free`
                : `No vehicle · ${freeSlotsCount}/6 free`}
            </span>
          </div>
        </div>
      </div>

      {/* Model error */}
      {modelError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {modelError}
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setCameraMode('ipcam')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            cameraMode === 'ipcam'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Phone Camera
        </button>
        <button
          onClick={() => setCameraMode('webcam')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            cameraMode === 'webcam'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Monitor className="w-4 h-4" />
          PC Webcam
        </button>
      </div>

      {/* IP Cam URL input */}
      {cameraMode === 'ipcam' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <Wifi className="w-4 h-4 flex-shrink-0" />
            <span>
              Open <strong>DroidCam</strong> on your phone → note the IP shown → make sure PC &amp; phone are on the <strong>same Wi-Fi</strong>.
              Default stream: <code className="bg-blue-100 px-1 rounded">http://&lt;phone-ip&gt;:4747/video</code>
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={ipCamInputVal}
              onChange={e => setIpCamInputVal(e.target.value)}
              placeholder="http://192.168.x.x:4747/video"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                setIpCamUrl(ipCamInputVal);
                setIpCamError(false);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Connect
            </button>
          </div>
          {ipCamError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Could not load stream. Make sure your phone and PC are on the same Wi-Fi.
            </p>
          )}
        </div>
      )}

      {/* Video / Image source + canvas overlay */}
      <div className="relative rounded-lg overflow-hidden bg-gray-900 aspect-video">
        {/* PC Webcam */}
        {cameraMode === 'webcam' && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        )}

        {/* Phone IP Cam — MJPEG stream loads via <img> */}
        {cameraMode === 'ipcam' && (
          <img
            ref={imgRef}
            src={ipCamUrl}
            alt="Phone camera stream"
            crossOrigin="anonymous"
            className="w-full h-full object-contain"
            onError={() => setIpCamError(true)}
            onLoad={() => setIpCamError(false)}
          />
        )}

        {/* Detection overlay canvas */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />

        {/* Loading spinner */}
        {isModelLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 text-white text-sm gap-2">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            Loading AI model…
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
        <strong>Detection:</strong> Scans every 1.5 sec for cars, trucks, buses &amp; motorcycles.
        Draws slot boundaries and marks each as <span className="text-green-700 font-semibold">Free</span> or{' '}
        <span className="text-red-600 font-semibold">Occupied</span>.
      </div>
    </div>
  );
}
