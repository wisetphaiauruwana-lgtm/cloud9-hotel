import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DocumentType, ExtractedData } from '../../types';
import Button from '../ui/Button';
import { ImageIcon, CameraIcon, CheckCircleIcon } from '../icons/Icons';
import { useTranslation } from '../../hooks/useTranslation';
import { apiService } from '../../services/apiService';
import MainLayout from '../layout/MainLayout';

interface DocumentCaptureScreenProps {
  onCapture: (base64Image: string, extractedData: ExtractedData) => Promise<void>;
  onBack: () => void;
  documentType: DocumentType;
}

type CaptureMode = 'camera' | 'upload';

const imageToPureBase64 = (dataUrl: string): string =>
  dataUrl.split(',')[1];

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const DocumentCaptureScreen: React.FC<DocumentCaptureScreenProps> = ({
  onCapture,
  onBack,
  documentType,
}) => {
  const { t } = useTranslation();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<CaptureMode>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isImageCaptured, setIsImageCaptured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // ================= Camera helpers =================

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setStatusMessage('Camera not available');
    }
  }, []);

  useEffect(() => {
    if (mode === 'camera' && !capturedImage) startCamera();
    else stopCamera();
    return stopCamera;
  }, [mode, capturedImage, startCamera, stopCamera]);

  // ================= Capture logic =================

  const submitImage = async (base64: string) => {
    setIsLoading(true);
    setStatusMessage('Analyzing...');
    try {
      const data =
        documentType === DocumentType.IDCard
          ? await apiService.verifyIDCard(base64)
          : await apiService.verifyPassport(base64);

      await onCapture(base64, data);
      setStatusMessage('Verified');
    } catch (e: any) {
      setStatusMessage(e.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCameraCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    const img = canvas.toDataURL('image/jpeg', 0.9);

    stopCamera();
    setCapturedImage(img);
    setIsImageCaptured(true);

    await submitImage(imageToPureBase64(img));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setCapturedImage(preview);
    setIsImageCaptured(true);

    const base64 = await fileToBase64(file);
    await submitImage(base64);
  };

  const reset = () => {
    if (capturedImage?.startsWith('blob:')) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setIsImageCaptured(false);
    setStatusMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (mode === 'camera') startCamera();
  };

  // ================= UI =================

  const renderVerifiedView = () => (
    <div className="flex flex-col items-center space-y-6">
      <div className="relative w-full max-w-[320px]">
        <div className="border-2 border-emerald-400 rounded-xl overflow-hidden">
          {capturedImage && (
            <img src={capturedImage} className="w-full object-contain" />
          )}
        </div>

        <div
          className="
            absolute -top-4 left-1/2 -translate-x-1/2
            w-8 h-8 bg-emerald-500 rounded-full
            flex items-center justify-center
          "
        >
          <CheckCircleIcon className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold">Document Verified!</p>
        <p className="text-sm text-gray-500">Continue to Check-in.</p>
      </div>

      <Button className="w-full bg-black text-white">
        SUBMIT
      </Button>
    </div>
  );

  const renderCaptureView = () => (
    <div className="flex flex-col items-center space-y-6">
      <h2 className="text-xl font-bold">
        {documentType === DocumentType.IDCard
          ? t('documentCapture.promptID')
          : t('documentCapture.promptPassport')}
      </h2>

      <div className="flex space-x-2 bg-gray-100 p-2 rounded-full">
        <button
          onClick={() => { setMode('camera'); reset(); }}
          className={`px-4 py-2 rounded-full ${mode === 'camera' ? 'bg-white shadow' : ''}`}
        >
          <CameraIcon className="inline-block w-5 h-5 mr-1" />
          Capture
        </button>

        <button
          onClick={() => { setMode('upload'); reset(); }}
          className={`px-4 py-2 rounded-full ${mode === 'upload' ? 'bg-white shadow' : ''}`}
        >
          <ImageIcon className="inline-block w-5 h-5 mr-1" />
          Upload
        </button>
      </div>

      {mode === 'camera' ? (
        <>
          {/* กล้อง */}
          <div
            className="
              w-full
              max-w-[320px]
              aspect-[85.6/54]
              bg-gray-100
              rounded-lg
              overflow-hidden
            "
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          {/* canvas สำหรับ capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* ปุ่มถ่ายรูป (ดันลงชัดเจน) */}
          <button
            onClick={handleCameraCapture}
            className="
              w-20 h-20
              mt-14 sm:mt-16
              rounded-full
              border-4 border-black
              flex items-center justify-center
            "
          >
            <div className="w-14 h-14 rounded-full bg-black" />
          </button>
        </>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <label
            className="px-4 py-2 bg-gray-100 rounded-lg cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            Select File
          </label>
        </>
      )}
    </div>
  );

  return (
    <MainLayout
      title={documentType === DocumentType.IDCard ? 'Scan ID Card' : 'Scan Passport'}
      onBack={onBack}
    >
      <div className="p-6">
        {isLoading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin" />
            <p>{statusMessage}</p>
          </div>
        ) : isImageCaptured ? (
          renderVerifiedView()
        ) : (
          renderCaptureView()
        )}
      </div>
    </MainLayout>
  );
};

export default DocumentCaptureScreen;
