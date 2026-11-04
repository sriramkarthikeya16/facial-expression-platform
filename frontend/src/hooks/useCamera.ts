/**
 * MoodLens - Camera Hook (Spec FR-001 & Section 3)
 * Manages webcam access, device enumeration, device switching, stream lifecycle, and disconnections.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

interface UseCameraOptions {
  autoStart?: boolean;
  videoWidth?: number;
  videoHeight?: number;
}

export function useCamera(options: UseCameraOptions = {}) {
  const { autoStart = false, videoWidth = 640, videoHeight = 480 } = options;

  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Enumerate all connected video input devices
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
        }));
      setAvailableDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Failed to enumerate media devices:', err);
    }
  }, [selectedDeviceId]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.onended = null;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    if (isMountedRef.current) {
      setIsActive(false);
    }
    isStartingRef.current = false;
  }, []);

  const startCamera = useCallback(
    async (targetDeviceId?: string) => {
      if (isStartingRef.current) return;
      isStartingRef.current = true;

      try {
        if (isMountedRef.current) {
          setError(null);
        }

        // Stop previous tracks if active
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const deviceToUse = targetDeviceId || selectedDeviceId;

        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: videoWidth },
          height: { ideal: videoHeight },
        };

        if (deviceToUse) {
          videoConstraints.deviceId = { exact: deviceToUse };
        } else {
          videoConstraints.facingMode = 'user';
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        if (!isMountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        // Setup disconnection handler on tracks
        stream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            if (isMountedRef.current) {
              setError('Camera device was disconnected. Please select another camera.');
              setIsActive(false);
            }
          };
        });

        streamRef.current = stream;

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;

          video.onloadedmetadata = () => {
            if (videoRef.current === video && isMountedRef.current) {
              video.play().catch((playErr: any) => {
                if (playErr.name !== 'AbortError') {
                  console.warn('Playback error:', playErr);
                }
              });
            }
          };
        }

        if (isMountedRef.current) {
          setIsActive(true);
          setHasPermission(true);
        }

        // Refresh device labels after permission is granted
        await refreshDevices();
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }

        console.error('Camera access error:', err);
        if (isMountedRef.current) {
          setIsActive(false);
          setHasPermission(false);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setError(
              'Camera permission was denied. Please allow camera access in your browser settings.'
            );
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setError('No camera device was found on this system.');
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            setError('Camera is currently in use by another application or unavailable.');
          } else if (err.name === 'OverconstrainedError') {
            // Fallback to default device
            if (targetDeviceId) {
              setSelectedDeviceId('');
              startCamera('');
              return;
            }
            setError('Requested camera constraints could not be satisfied.');
          } else {
            setError('Unable to access camera: ' + (err.message || 'Unknown error'));
          }
        }
      } finally {
        isStartingRef.current = false;
      }
    },
    [selectedDeviceId, videoWidth, videoHeight, refreshDevices]
  );

  const selectCamera = useCallback(
    async (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      if (isActive) {
        await startCamera(deviceId);
      }
    },
    [isActive, startCamera]
  );

  const toggleCamera = useCallback(() => {
    if (isActive) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [isActive, startCamera, stopCamera]);

  // Handle hardware device plug/unplug events
  useEffect(() => {
    const handleDeviceChange = () => {
      refreshDevices();
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

  useEffect(() => {
    isMountedRef.current = true;
    if (autoStart) {
      startCamera();
    }
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [autoStart, startCamera, stopCamera]);

  return {
    videoRef,
    isActive,
    hasPermission,
    error,
    isMuted,
    setIsMuted,
    availableDevices,
    selectedDeviceId,
    selectCamera,
    startCamera,
    stopCamera,
    toggleCamera,
  };
}
