import {
  FaceLandmarker,
  FilesetResolver,
  FaceLandmarkerResult
} from '@mediapipe/tasks-vision';
import { BoundingBox } from '../types/expression';

export interface LandmarkDetectorResult {
  detected: boolean;
  /** 478 3D landmarks, normalized [0,1] */
  landmarks: Array<{ x: number; y: number; z: number }> | null;
  /** MediaPipe native blend shape coefficients */
  blendShapes: Map<string, number> | null;
  /** Face transformation matrix for head pose extraction */
  facialTransformationMatrix: number[] | null;
  /** Bounding box derived from landmarks */
  box: BoundingBox | null;
  /** Landmark detection confidence (0-1) */
  confidence: number;
  /** Number of faces detected */
  faceCount: number;
}

export class LandmarkDetector {
  private landmarker: FaceLandmarker | null = null;
  private ready: boolean = false;
  private isInitializing: boolean = false;
  private lastTimestampMs: number = 0;

  constructor() {
    this.initLandmarker();
  }

  private async initLandmarker(): Promise<void> {
    if (this.isInitializing || this.ready) return;
    this.isInitializing = true;

    try {
      console.log('MoodLens: Initializing MediaPipe FaceLandmarker...');

      // 1. Resolve vision tasks WASM (Local first, then CDN)
      let vision: any = null;
      try {
        vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      } catch (e) {
        console.warn('MoodLens: Local wasm resolver failed, trying CDN...', e);
      }

      if (!vision) {
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
      }

      // 2. Resolve model asset path (Local first, then CDN)
      const modelPaths = [
        '/mediapipe/face_landmarker.task',
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
      ];

      for (const modelPath of modelPaths) {
        // Try GPU delegate first, fallback to CPU
        for (const delegate of ['GPU', 'CPU'] as const) {
          try {
            console.log(`MoodLens: Attempting FaceLandmarker (${delegate}) with ${modelPath}...`);
            this.landmarker = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: modelPath,
                delegate: delegate,
              },
              outputFaceBlendshapes: true,
              outputFacialTransformationMatrixes: true,
              runningMode: 'VIDEO',
              numFaces: 1,
            });

            this.ready = true;
            this.isInitializing = false;
            console.log(`MoodLens: ✓ FaceLandmarker ready [${delegate}] with ${modelPath}`);
            return;
          } catch (createErr) {
            console.warn(`MoodLens: FaceLandmarker ${delegate} failed with ${modelPath}:`, (createErr as Error).message?.slice(0, 100));
          }
        }
      }

      console.error('MoodLens: ✗ Failed all FaceLandmarker initialization attempts.');
    } catch (error) {
      console.error('MoodLens: Fatal FaceLandmarker initialization error:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  public async detect(video: HTMLVideoElement, timestampMs: number): Promise<LandmarkDetectorResult> {
    const defaultResult: LandmarkDetectorResult = {
      detected: false,
      landmarks: null,
      blendShapes: null,
      facialTransformationMatrix: null,
      box: null,
      confidence: 0,
      faceCount: 0
    };

    if (!this.ready || !this.landmarker || !video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return defaultResult;
    }

    try {
      // MediaPipe VIDEO mode strictly requires monotonically increasing timestamps
      const safeTimestamp = Math.max(this.lastTimestampMs + 1, Math.round(timestampMs || performance.now()));
      this.lastTimestampMs = safeTimestamp;

      const result: FaceLandmarkerResult = this.landmarker.detectForVideo(video, safeTimestamp);

      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0];

        let minX = 1, minY = 1, maxX = 0, maxY = 0;
        const normalizedLandmarks = landmarks.map(lm => {
          minX = Math.min(minX, lm.x);
          minY = Math.min(minY, lm.y);
          maxX = Math.max(maxX, lm.x);
          maxY = Math.max(maxY, lm.y);
          return { x: lm.x, y: lm.y, z: lm.z || 0 };
        });

        const xMinClamped = Math.max(0, minX);
        const yMinClamped = Math.max(0, minY);
        const xMaxClamped = Math.min(1, maxX);
        const yMaxClamped = Math.min(1, maxY);

        const box: BoundingBox = {
          x: xMinClamped,
          y: yMinClamped,
          width: Math.max(0, xMaxClamped - xMinClamped),
          height: Math.max(0, yMaxClamped - yMinClamped),
        };

        const blendShapesMap = new Map<string, number>();
        if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
          const shapes = result.faceBlendshapes[0].categories;
          for (const shape of shapes) {
            blendShapesMap.set(shape.categoryName, shape.score);
          }
        }

        let transformationMatrix: number[] | null = null;
        if (result.facialTransformationMatrixes && result.facialTransformationMatrixes.length > 0) {
          const matrixData = result.facialTransformationMatrixes[0].data;
          transformationMatrix = Array.from(matrixData);
        }

        return {
          detected: true,
          landmarks: normalizedLandmarks,
          blendShapes: blendShapesMap,
          facialTransformationMatrix: transformationMatrix,
          box: box,
          confidence: 0.95,
          faceCount: result.faceLandmarks.length
        };
      }

      return defaultResult;
    } catch (error) {
      console.warn('MoodLens: FaceLandmarker detectForVideo error:', error);
      return defaultResult;
    }
  }

  public isReady(): boolean {
    return this.ready;
  }

  /** Soft reset on camera frame loss — does NOT destroy model */
  public reset(): void {
    this.lastTimestampMs = 0;
  }

  /** Full cleanup on application unmount */
  public destroy(): void {
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch (e) {
        // ignore close errors
      }
      this.landmarker = null;
      this.ready = false;
    }
  }
}
