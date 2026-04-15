import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import * as API from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function FaceRegistration({ onSuccess }) {
  const { currentUser, login } = useAuth(); // We might need to refresh user state
  const [phase, setPhase] = useState('idle'); // idle -> loading-models -> ready -> scanning -> success
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Load models from jsdelivr CDN to avoid local binary hosting issues
  const loadModels = async () => {
    setPhase('loading-models');
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setPhase('ready');
      startCamera();
    } catch (err) {
      console.error(err);
      setError('Failed to load Face AI models. Check your internet connection.');
      setPhase('idle');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Webcam access denied. We need webcam access to register your face.');
      setPhase('idle');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    // Cleanup camera when unmounting
    return () => stopCamera();
  }, []);

  const captureAndRegister = async () => {
    setPhase('scanning');
    setError(null);
    try {
      if (!videoRef.current) throw new Error('Video not active');

      // Detect face
      const detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected. Please ensure you are clearly visible and well-lit.');
      }

      // Convert Float32Array to standard array
      const descriptorArray = Array.from(detection.descriptor);

      // Save to backend
      await API.updateUser(currentUser._id, {
        faceRegistered: true,
        faceDescriptor: descriptorArray
      });

      setPhase('success');
      stopCamera();

      // Trigger the parent callback to unblock AppShell
      setTimeout(() => {
        onSuccess(descriptorArray);
      }, 1500);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Face capture failed');
      setPhase('ready');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#0a0c13', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: '"DM Sans", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#131620', borderRadius: 20, padding: 30, border: '1px solid #252840', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🤖</div>
        <h2 className="syne" style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Register Your Face</h2>
        <p style={{ color: '#7a85a3', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
          To securely log your attendance, you must register your face. This mathematical representation will be encrypted and stored securely on our servers.
        </p>

        <div style={{ aspectRatio: '4/3', background: '#000', borderRadius: 12, overflow: 'hidden', position: 'relative', marginBottom: 20 }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: (phase === 'ready' || phase === 'scanning') ? 'block' : 'none' }} 
          />
          
          {(phase === 'idle' || phase === 'loading-models' || phase === 'success') && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#7a85a3' }}>
              {phase === 'idle' && <div style={{ fontSize: 40, opacity: 0.3 }}>📷</div>}
              {phase === 'loading-models' && (
                <>
                  <div className="spin" style={{ fontSize: 32, color: '#6366f1', marginBottom: 12 }}>⚙</div>
                  <div style={{ fontSize: 12 }}>Downloading Retina Models... (~10MB)</div>
                </>
              )}
              {phase === 'success' && (
                <>
                  <div style={{ fontSize: 48 }}>✅</div>
                  <div style={{ color: '#10b981', fontWeight: 700, marginTop: 10 }}>Face Registered & Secured!</div>
                </>
              )}
            </div>
          )}
          
          {phase === 'scanning' && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <div className="pulse" style={{ width: 120, height: 120, borderRadius: '50%', border: '4px solid #6366f1', background: 'rgba(99,102,241,0.2)' }} />
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20, textAlign: 'left' }}>
            ⚠ {error}
          </div>
        )}

        {phase === 'idle' && (
           <button onClick={loadModels} style={{ width: '100%', padding: '12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
             Start Camera Setup
           </button>
        )}

        {(phase === 'ready' || phase === 'scanning') && (
           <button onClick={captureAndRegister} disabled={phase === 'scanning'} style={{ width: '100%', padding: '12px', background: phase === 'scanning' ? '#4a5578' : '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: phase === 'scanning' ? 'not-allowed' : 'pointer' }}>
             {phase === 'scanning' ? 'Extracting Biometrics...' : 'Capture & Secure My Face'}
           </button>
        )}
      </div>
    </div>
  );
}
