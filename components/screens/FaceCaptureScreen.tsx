
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Guest } from '../../types';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import Button from '../ui/Button';
import { CheckIcon } from '../icons/Icons';
import { useTranslation } from '../../hooks/useTranslation';

interface FaceCaptureScreenProps {
  guest: Guest;
  onCapture: (base64Image: string) => void;
  onBack: () => void;
}

const styles = {
  container: "relative flex flex-col min-h-screen bg-white text-gray-900",
  overlay: "absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-10",
  successIconContainer: "w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 bg-green-500 rounded-full flex items-center justify-center animate-pulse",
  successIcon: "w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 text-white",
  overlayText: "mt-4 text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900",
  main: "flex-grow flex flex-col items-center justify-center p-6 text-center space-y-4",
  prompt: "text-lg md:text-xl lg:text-2xl text-gray-600",
  videoContainer: "relative w-64 h-80 md:w-80 md:h-[400px] lg:w-96 lg:h-[480px] rounded-lg overflow-hidden bg-gray-100 shadow-lg border border-gray-200",
  video: "w-full h-full object-cover",
  captureFrameBase: "absolute inset-0 border-4",
  captureFrameDefault: "border-dashed border-gray-400",
  captureFrameSuccess: "border-green-500",
  successCheckContainer: "absolute top-2 right-2 bg-green-500 rounded-full p-1",
  successCheckIcon: "w-4 h-4 text-white",
  canvas: "hidden",
  statusTextSuccess: "text-green-500 md:text-lg lg:text-xl",
  recordButtonOuter: "w-20 h-20 rounded-full border-4 border-red-500 flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80",
  recordButtonInner: "w-16 h-16 rounded-full bg-red-500",
  footer: "p-6 md:p-8 lg:p-10",
  buttonGroup: "space-y-3",
};

const FaceCaptureScreen: React.FC<FaceCaptureScreenProps> = ({ guest, onCapture, onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);
  
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        setIsSuccess(true);
        stopCamera();
      }
    }
  };
  
  const handleSubmit = () => {
    if (capturedImage) {
      setIsSubmitting(true);
      setTimeout(() => {
        onCapture(capturedImage.split(',')[1]); // send base64 data only
      }, 1500);
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null);
    setIsSuccess(false);
    startCamera();
  }

  return (
    <div className={styles.container}>
      {isSubmitting && (
        <div className={styles.overlay}>
          <div className={styles.successIconContainer}>
            <CheckIcon className={styles.successIcon} />
          </div>
          <p className={styles.overlayText}>{t('faceCapture.saved')}</p>
        </div>
      )}
      <Header onBack={onBack} />
      <main className={styles.main}>
        <p className={styles.prompt}>{t('faceCapture.title')}</p>
        <div className={styles.videoContainer}>
          {capturedImage ? (
             <img src={capturedImage} alt="Captured face" className={styles.video} />
          ) : (
            <video ref={videoRef} autoPlay playsInline className={styles.video} />
          )}
          <div className={`${styles.captureFrameBase} ${isSuccess ? styles.captureFrameSuccess : styles.captureFrameDefault}`}>
            {isSuccess && (
              <div className={styles.successCheckContainer}>
                <CheckIcon className={styles.successCheckIcon} />
              </div>
            )}
          </div>
        </div>
        <canvas ref={canvasRef} className={styles.canvas} />
        {isSuccess ? (
          <p className={styles.statusTextSuccess}>{t('faceCapture.success')}</p>
        ) : (
          <div className={styles.recordButtonOuter} onClick={handleCapture}>
            <div className={styles.recordButtonInner}></div>
          </div>
        )}
      </main>
      <div className={styles.footer}>
        {capturedImage ? (
           <div className={styles.buttonGroup}>
             <Button onClick={handleSubmit} disabled={isSubmitting}>{t('buttons.submit')}</Button>
             <Button onClick={retakePhoto} variant='secondary' disabled={isSubmitting}>{t('buttons.retake')}</Button>
           </div>
        ) : (
          // This container ensures consistent height whether buttons are present or not
          <div className="h-24"></div> 
        )}
      </div>
      <Footer />
    </div>
  );
};

export default FaceCaptureScreen;
