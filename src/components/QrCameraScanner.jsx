import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

export function QrCameraScanner({ onDetected, disabled }) {
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState(null);
  const scannerRef = useRef(null);
  const busyRef = useRef(false);

  const stopCamera = async () => {
    const inst = scannerRef.current;
    if (inst) {
      try {
        if (inst.isScanning) await inst.stop();
      } catch {
        /* ignore */
      }
      try {
        inst.clear();
      } catch {
        /* ignore */
      }
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCamError(null);
    busyRef.current = false;
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("campussave-qr-reader");
      }
      setScanning(true);
      await scannerRef.current.start(
        { facingMode: "environment" }, // caméra arrière sur téléphone
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          if (busyRef.current) return;
          busyRef.current = true;
          await stopCamera();
          onDetected(decodedText);
        },
        () => {}
      );
    } catch {
      setScanning(false);
      setCamError(
        "Caméra en direct indisponible (sur téléphone, la vidéo nécessite HTTPS). Utilisez « Photo / Image QR » ou saisissez le code."
      );
    }
  };

  const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCamError(null);
    await stopCamera();
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("campussave-qr-reader");
      }
      const decodedText = await scannerRef.current.scanFile(file, false);
      onDetected(decodedText);
    } catch {
      setCamError("Aucun QR code détecté sur cette image.");
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {!scanning ? (
          <button
            type="button"
            disabled={disabled}
            onClick={startCamera}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-emerald-700 cursor-pointer disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
            Scanner par caméra
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Arrêter la caméra
          </button>
        )}

        <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-emerald-700 cursor-pointer">
          <ImageUp className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
          Photo / Image QR
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={disabled}
            onChange={handleFileScan}
            className="hidden"
          />
        </label>
      </div>

      {/* Conteneur toujours présent dans le DOM pour éviter les erreurs React */}
      <div
        id="campussave-qr-reader"
        className={scanning ? "overflow-hidden rounded-lg border border-slate-200 bg-black" : "hidden"}
      />

      {camError && (
        <p className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          {camError}
        </p>
      )}
    </div>
  );
}