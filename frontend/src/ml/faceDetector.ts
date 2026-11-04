import { FaceDetectionResult, BoundingBox, CandidateFace } from '../types/expression';
import { LandmarkDetector, LandmarkDetectorResult } from './landmarkDetector';
import { THRESHOLDS } from '../../../shared/configuration/thresholds';

export class FaceDetector {
  private detectCanvas: HTMLCanvasElement;
  private detectCtx: CanvasRenderingContext2D | null;
  private cropCanvas: HTMLCanvasElement;
  private cropCtx: CanvasRenderingContext2D | null;
  private prevBox: BoundingBox | null = null;
  private consecutiveDetections = 0;

  // Tier 1: Hardware-Accelerated Native Browser FaceDetector (Optional Optimization)
  private nativeFaceDetector: any = null;
  private nativeDisabled = false;
  private nativeSuccessCount = 0;
  private nativeZeroCount = 0;

  // Tier 2: LandmarkDetector (replaces MediaPipe Face Detection)
  private landmarkDetector: LandmarkDetector;
  private isProcessing = false;

  constructor() {
    this.detectCanvas = document.createElement('canvas');
    this.detectCanvas.width = 160;
    this.detectCanvas.height = 120;
    this.detectCtx = this.detectCanvas.getContext('2d', { willReadFrequently: true });

    this.cropCanvas = document.createElement('canvas');
    this.cropCanvas.width = 112;
    this.cropCanvas.height = 112;
    this.cropCtx = this.cropCanvas.getContext('2d', { willReadFrequently: true });

    this.initNativeDetector();
    this.landmarkDetector = new LandmarkDetector();
  }

  private initNativeDetector() {
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        this.nativeFaceDetector = new (window as any).FaceDetector({
          fastMode: true,
          maxDetectedFaces: 4,
        });
        console.log('MoodLens: Native Browser FaceDetector available as optional accelerator.');
      } catch (e) {
        console.warn('MoodLens: Native FaceDetector unsupported, relying on LandmarkDetector.', e);
        this.nativeFaceDetector = null;
        this.nativeDisabled = true;
      }
    }
  }

  /**
   * Dispatches detection: Native (optional) -> LandmarkDetector (primary) -> Structural CV (fallback).
   * Empty result from native detector NEVER terminates the pipeline.
   */
  public async detect(video: HTMLVideoElement): Promise<FaceDetectionResult> {
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      this.prevBox = null;
      return { detected: false, qualityScore: 0, trackingConfidence: 0, faceCount: 0, activeDetector: 'None' };
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    // ── Tier 1: Primary MediaPipe FaceLandmarker (478 3D Landmarks + 52 Blend Shapes) ──
    if (this.landmarkDetector.isReady() && !this.isProcessing) {
      try {
        this.isProcessing = true;
        const timestampMs = performance.now();
        const lmResult = await this.landmarkDetector.detect(video, timestampMs);
        if (lmResult && lmResult.detected && lmResult.landmarks) {
          const result = this.processLandmarkResult(lmResult, width, height);
          result.activeDetector = 'LandmarkDetector';
          return result;
        }
      } catch (err) {
        console.warn('MoodLens: LandmarkDetector process frame error:', err);
      } finally {
        this.isProcessing = false;
      }
    }

    // ── Tier 2: Native Browser FaceDetector (Bounding Box Fallback) ──
    if (this.nativeFaceDetector && !this.nativeDisabled) {
      try {
        const faces = await this.nativeFaceDetector.detect(video);
        if (faces && faces.length > 0) {
          this.nativeSuccessCount++;
          const result = this.processNativeFaces(faces, width, height);
          result.activeDetector = 'Native';
          return result;
        }
        this.nativeZeroCount++;
        if (this.nativeSuccessCount === 0 && this.nativeZeroCount >= 3) {
          this.nativeDisabled = true;
        }
      } catch (err) {
        console.warn('MoodLens: Native FaceDetector threw error, disabling:', err);
        this.nativeDisabled = true;
      }
    }

    // ── Tier 3: Computer Vision Structural Fallback ──
    const cvResult = this.detectStructuralFace(video);
    if (cvResult.detected) {
      cvResult.activeDetector = 'StructuralCV';
      return cvResult;
    }

    // Truly no face in camera view across all detectors
    this.consecutiveDetections = 0;
    this.prevBox = null;
    return {
      detected: false,
      qualityScore: 0,
      trackingConfidence: 0,
      faceCount: 0,
      activeDetector: 'None',
    };
  }

  private processNativeFaces(faces: any[], width: number, height: number): FaceDetectionResult {
    const candidates: CandidateFace[] = faces.map((face, index) => {
      const b = face.boundingBox;
      const padX = b.width * 0.15;
      const padY = b.height * 0.15;
      const pixelX = Math.max(0, b.x - padX);
      const pixelY = Math.max(0, b.y - padY);
      const pixelW = Math.min(width - pixelX, b.width + 2 * padX);
      const pixelH = Math.min(height - pixelY, b.height + 2 * padY);

      const area = (pixelW * pixelH) / (width * height);
      const centerX = (pixelX + pixelW / 2) / width;
      const centerY = (pixelY + pixelH / 2) / height;
      const centerDist = Math.hypot(centerX - 0.5, centerY - 0.5);
      const centerScore = Math.max(0, 1 - centerDist * 1.5);
      const qualityScore = Math.min(1.0, area * 2.0 + 0.35 + centerScore * 0.20);

      return {
        id: `face_native_${index}`,
        box: { x: pixelX, y: pixelY, width: pixelW, height: pixelH },
        confidence: 0.95,
        qualityScore,
        area,
        isPrimary: false,
      };
    });

    candidates.sort((a, b) => b.qualityScore - a.qualityScore);
    candidates[0].isPrimary = true;
    return {
      ...this.smoothAndFormatBox(candidates[0], candidates.length, candidates),
      activeDetector: 'Native',
    };
  }

  private processLandmarkResult(lmResult: LandmarkDetectorResult, width: number, height: number): FaceDetectionResult {
    const rawBox: any = lmResult.box || { x: 0, y: 0, width: 1, height: 1 };
    
    // Normalize coordinates if needed, supporting both {x, y, width, height} and legacy {xMin, yMin, xMax, yMax}
    const xMin = rawBox.x !== undefined ? rawBox.x : (rawBox.xMin ?? 0);
    const yMin = rawBox.y !== undefined ? rawBox.y : (rawBox.yMin ?? 0);
    const boxW = rawBox.width !== undefined ? rawBox.width : ((rawBox.xMax ?? 1) - xMin);
    const boxH = rawBox.height !== undefined ? rawBox.height : ((rawBox.yMax ?? 1) - yMin);

    const padX = boxW * 0.15;
    const padY = boxH * 0.15;
    const pixelX = Math.max(0, (xMin - padX) * width);
    const pixelY = Math.max(0, (yMin - padY) * height);
    const pixelW = Math.min(width - pixelX, (boxW + 2 * padX) * width);
    const pixelH = Math.min(height - pixelY, (boxH + 2 * padY) * height);

    const area = (pixelW * pixelH) / (width * height);
    const detConfidence = lmResult.confidence || 0.95;

    const centerX = (pixelX + pixelW / 2) / width;
    const centerY = (pixelY + pixelH / 2) / height;
    const centerDist = Math.hypot(centerX - 0.5, centerY - 0.5);
    const centerScore = Math.max(0, 1 - centerDist * 1.5);

    const qualityScore = Math.min(1.0, area * 2.0 + detConfidence * 0.35 + centerScore * 0.20);

    const candidate: CandidateFace = {
      id: `face_lm_0`,
      box: { x: pixelX, y: pixelY, width: pixelW, height: pixelH },
      confidence: detConfidence,
      qualityScore,
      area,
      isPrimary: true,
    };

    const baseResult = this.smoothAndFormatBox(candidate, lmResult.faceCount, [candidate]);

    // Optional additional properties beyond standard FaceDetectionResult interface
    return {
      ...baseResult,
      landmarks: lmResult.landmarks ? lmResult.landmarks.map(lm => ({ x: lm.x, y: lm.y })) : undefined,
      landmarks3d: lmResult.landmarks || undefined,
      blendShapes: lmResult.blendShapes || undefined,
      facialTransformationMatrix: lmResult.facialTransformationMatrix || undefined,
      activeDetector: 'LandmarkDetector',
    } as any;
  }

  private smoothAndFormatBox(
    primary: CandidateFace,
    faceCount: number,
    candidates: CandidateFace[]
  ): FaceDetectionResult {
    let currentBox = { ...primary.box };

    if (this.prevBox) {
      currentBox.x = this.prevBox.x * 0.70 + currentBox.x * 0.30;
      currentBox.y = this.prevBox.y * 0.70 + currentBox.y * 0.30;
      currentBox.width = this.prevBox.width * 0.70 + currentBox.width * 0.30;
      currentBox.height = this.prevBox.height * 0.70 + currentBox.height * 0.30;
    }

    this.prevBox = currentBox;
    this.consecutiveDetections++;

    const trackingConfidence = Math.min(1.0, 0.70 + this.consecutiveDetections * 0.05);

    return {
      detected: true,
      box: currentBox,
      qualityScore: primary.qualityScore,
      trackingConfidence,
      faceCount,
      candidates,
    };
  }

  /**
   * Structural CV Face Detector.
   * Leverages YCbCr human skin chrominance modeling, global luminance texture analysis,
   * and facial feature variation to detect real faces while rejecting empty walls/objects.
   */
  private detectStructuralFace(video: HTMLVideoElement): FaceDetectionResult {
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!this.detectCtx) {
      return { detected: false, qualityScore: 0, trackingConfidence: 0, faceCount: 0 };
    }

    this.detectCtx.drawImage(video, 0, 0, 160, 120);
    const imageData = this.detectCtx.getImageData(0, 0, 160, 120);
    const data = imageData.data;

    let totalLuminance = 0;
    let skinPixelCount = 0;
    let weightedX = 0;
    let weightedY = 0;
    let minX = 160;
    let maxX = 0;
    let minY = 120;
    let maxY = 0;
    const totalPixels = 160 * 120;
    const lums = new Float32Array(totalPixels);

    for (let y = 0; y < 120; y++) {
      for (let x = 0; x < 160; x++) {
        const idx = y * 160 + x;
        const i = idx * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        lums[idx] = lum;
        totalLuminance += lum;

        // YCbCr skin tone detection across all skin tones:
        // Cr in [133, 173], Cb in [77, 127], with natural RGB dominance
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;

        const isSkin = (
          cr >= 133 && cr <= 173 &&
          cb >= 77 && cb <= 127 &&
          r > 45 && g > 35 && b > 20 &&
          r > b && (r - g) >= 5
        );

        if (isSkin) {
          skinPixelCount++;
          weightedX += x;
          weightedY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const avgLuminance = totalLuminance / totalPixels;
    const skinRatio = skinPixelCount / totalPixels;

    // A real face in webcam view occupies 4% to 60% of the frame.
    // > 60% is a wall/floor/background. < 4% or < 500 pixels is negligible.
    if (skinRatio < 0.04 || skinRatio > 0.60 || skinPixelCount < 500 || avgLuminance < 25 || avgLuminance > 240) {
      this.consecutiveDetections = 0;
      this.prevBox = null;
      return { detected: false, qualityScore: 0, trackingConfidence: 0, faceCount: 0 };
    }

    // Luminance standard deviation across the entire frame
    let sumVariance = 0;
    for (let i = 0; i < totalPixels; i++) {
      const diff = lums[i] - avgLuminance;
      sumVariance += diff * diff;
    }
    const stdDev = Math.sqrt(sumVariance / totalPixels);

    // Uniform painted walls and blank backgrounds have low standard deviation (< 10)
    if (stdDev < 12) {
      this.consecutiveDetections = 0;
      this.prevBox = null;
      return { detected: false, qualityScore: 0, trackingConfidence: 0, faceCount: 0 };
    }

    const spreadX = maxX - minX;
    const spreadY = maxY - minY;
    const clusterAspect = spreadX / Math.max(1, spreadY);

    // Proportions check for natural human head aspect ratio
    if (spreadX < 24 || spreadY < 28 || clusterAspect < 0.45 || clusterAspect > 1.45) {
      this.consecutiveDetections = 0;
      this.prevBox = null;
      return { detected: false, qualityScore: 0, trackingConfidence: 0, faceCount: 0 };
    }

    // Check central face region has internal texture variation (eyes, nose, mouth)
    let centerVariance = 0;
    let centerPixelCount = 0;
    const cX = Math.round(weightedX / skinPixelCount);
    const cY = Math.round(weightedY / skinPixelCount);
    const radX = Math.min(25, Math.round(spreadX * 0.3));
    const radY = Math.min(25, Math.round(spreadY * 0.3));

    for (let y = Math.max(0, cY - radY); y <= Math.min(119, cY + radY); y++) {
      for (let x = Math.max(0, cX - radX); x <= Math.min(159, cX + radX); x++) {
        const diff = lums[y * 160 + x] - avgLuminance;
        centerVariance += diff * diff;
        centerPixelCount++;
      }
    }
    const centerStdDev = centerPixelCount > 0 ? Math.sqrt(centerVariance / centerPixelCount) : 0;
    if (centerStdDev < 8) {
      // Solid uniform color in center = wall or paper, not a human face
      this.consecutiveDetections = 0;
      this.prevBox = null;
      return { detected: false, qualityScore: 0, trackingConfidence: 0, faceCount: 0 };
    }

    this.consecutiveDetections++;
    const trackingConfidence = Math.min(1.0, 0.65 + this.consecutiveDetections * 0.05);

    const centerX = (cX / 160) * width;
    const centerY = (cY / 120) * height;
    const detectedW = Math.max(width * 0.25, Math.min(width * 0.55, (spreadX / 160) * width * 1.25));
    const detectedH = detectedW * 1.30;

    const boxX = Math.max(0, Math.min(width - detectedW, centerX - detectedW / 2));
    const boxY = Math.max(0, Math.min(height - detectedH, centerY - detectedH / 2.2));

    const currentBox: BoundingBox = {
      x: boxX,
      y: boxY,
      width: detectedW,
      height: detectedH,
    };

    if (this.prevBox) {
      currentBox.x = this.prevBox.x * 0.70 + currentBox.x * 0.30;
      currentBox.y = this.prevBox.y * 0.70 + currentBox.y * 0.30;
      currentBox.width = this.prevBox.width * 0.70 + currentBox.width * 0.30;
      currentBox.height = this.prevBox.height * 0.70 + currentBox.height * 0.30;
    }

    this.prevBox = currentBox;

    return {
      detected: true,
      box: currentBox,
      qualityScore: 0.85,
      trackingConfidence,
      faceCount: 1,
      activeDetector: 'StructuralCV',
    };
  }

  /**
   * Crops the face from the video stream into a normalized 112x112 Float32Array RGB tensor
   * with landmark-based affine roll alignment (eye horizontal leveling).
   */
  public cropFaceTensor(
    video: HTMLVideoElement, 
    box: BoundingBox, 
    targetSize = 112,
    landmarks?: Array<{ x: number; y: number }>
  ): { tensor: Float32Array; pixels: Uint8ClampedArray; rollAngleDeg: number } | null {
    if (!video || !this.cropCtx || video.videoWidth === 0 || video.videoHeight === 0) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const sx = Math.max(0, Math.min(vw - 1, Math.floor(box.x)));
    const sy = Math.max(0, Math.min(vh - 1, Math.floor(box.y)));
    const sw = Math.max(1, Math.min(vw - sx, Math.floor(box.width)));
    const sh = Math.max(1, Math.min(vh - sy, Math.floor(box.height)));

    this.cropCtx.clearRect(0, 0, targetSize, targetSize);

    // Landmark-based affine roll angle calculation
    let rollAngleRad = 0;
    let rollAngleDeg = 0;
    
    // In MediaPipe 478 landmarks, indices 33 and 263 correspond to the left and right eye centers.
    // However, for compatibility with simpler inputs where only 2 landmarks are passed:
    if (landmarks && landmarks.length >= 2) {
      // Assuming index 0 is right eye and 1 is left eye if length is short, 
      // or using proper 478 landmark indices if full array is passed.
      const eye0 = landmarks.length > 263 ? landmarks[33] : landmarks[0];
      const eye1 = landmarks.length > 263 ? landmarks[263] : landmarks[1];
      const dx = (eye1.x - eye0.x) * vw;
      const dy = (eye1.y - eye0.y) * vh;
      rollAngleRad = Math.atan2(dy, dx);
      rollAngleDeg = Math.round((rollAngleRad * 180) / Math.PI);
    }

    if (Math.abs(rollAngleRad) > 0.035) {
      // Rotate around canvas center to level eyes horizontally
      this.cropCtx.save();
      const half = targetSize / 2;
      this.cropCtx.translate(half, half);
      this.cropCtx.rotate(-rollAngleRad);
      this.cropCtx.translate(-half, -half);
      this.cropCtx.drawImage(
        video,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        targetSize,
        targetSize
      );
      this.cropCtx.restore();
    } else {
      this.cropCtx.drawImage(
        video,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        targetSize,
        targetSize
      );
    }

    const imgData = this.cropCtx.getImageData(0, 0, targetSize, targetSize);
    const pixels = imgData.data;
    const numPixels = targetSize * targetSize;

    // Output shape: [1, 3, 112, 112] in CHW format, ImageNet normalized
    const float32Data = new Float32Array(3 * numPixels);
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    for (let i = 0; i < numPixels; i++) {
      const r = pixels[i * 4] / 255.0;
      const g = pixels[i * 4 + 1] / 255.0;
      const b = pixels[i * 4 + 2] / 255.0;

      float32Data[i] = (r - mean[0]) / std[0]; // R channel
      float32Data[numPixels + i] = (g - mean[1]) / std[1]; // G channel
      float32Data[2 * numPixels + i] = (b - mean[2]) / std[2]; // B channel
    }

    return { tensor: float32Data, pixels, rollAngleDeg };
  }

  public reset(): void {
    this.prevBox = null;
    this.consecutiveDetections = 0;
    this.isProcessing = false;
    if (this.landmarkDetector) {
      this.landmarkDetector.reset();
    }
  }
}
