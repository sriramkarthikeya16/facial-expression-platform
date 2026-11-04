/**
 * MoodLens — Inference Scheduler
 *
 * Separates camera rendering FPS from ML inference FPS.
 * The camera captures at 30 FPS, but ML inference runs at 15 FPS.
 * UI updates at 30 FPS (interpolating from latest ML result).
 *
 * This prevents the ML pipeline from becoming a bottleneck and ensures
 * smooth camera preview regardless of inference latency.
 */
import { THRESHOLDS } from '../../../shared/configuration/thresholds';

export interface SchedulerCallbacks {
  /** Called on every camera frame (30 FPS) — for UI rendering */
  onRenderFrame: (timestampMs: number) => void;
  /** Called on ML frames (15 FPS) — for the full inference pipeline */
  onInferenceFrame: (timestampMs: number) => Promise<void>;
}

/**
 * Manages the dual-rate loop: camera/UI at 30 FPS, ML at 15 FPS.
 * Uses requestAnimationFrame for rendering and frame-skipping for ML scheduling.
 */
export class InferenceScheduler {
  private animationFrameId: number | null = null;
  private isRunning = false;
  private frameCount = 0;
  private lastInferenceTime = 0;
  private inferenceIntervalMs: number;
  private isInferenceRunning = false;
  private callbacks: SchedulerCallbacks | null = null;

  // Performance tracking
  private inferenceLatencies: number[] = [];
  private renderLatencies: number[] = [];

  constructor() {
    this.inferenceIntervalMs = 1000 / THRESHOLDS.ML_INFERENCE_FPS;
  }

  /**
   * Start the dual-rate rendering/inference loop.
   */
  public start(callbacks: SchedulerCallbacks): void {
    if (this.isRunning) return;

    this.callbacks = callbacks;
    this.isRunning = true;
    this.frameCount = 0;
    this.lastInferenceTime = 0;
    this.isInferenceRunning = false;

    const loop = (timestamp: number) => {
      if (!this.isRunning) return;

      const renderStart = performance.now();

      // Always call render callback (30 FPS — as fast as requestAnimationFrame)
      this.callbacks?.onRenderFrame(timestamp);

      const renderEnd = performance.now();
      this.trackLatency(this.renderLatencies, renderEnd - renderStart);

      // Watchdog: If an inference frame took > 1500ms, force release to prevent thread freeze
      if (this.isInferenceRunning && timestamp - this.lastInferenceTime > 1500) {
        this.isInferenceRunning = false;
      }

      // Check if it's time for an ML inference frame
      const elapsed = timestamp - this.lastInferenceTime;
      if (elapsed >= this.inferenceIntervalMs && !this.isInferenceRunning) {
        this.lastInferenceTime = timestamp;
        this.isInferenceRunning = true;

        const inferenceStart = performance.now();
        this.callbacks?.onInferenceFrame(timestamp)
          .then(() => {
            const inferenceEnd = performance.now();
            this.trackLatency(this.inferenceLatencies, inferenceEnd - inferenceStart);
          })
          .catch((err) => {
            console.warn('MoodLens: Inference frame error:', err);
          })
          .finally(() => {
            this.isInferenceRunning = false;
          });
      }

      this.frameCount++;
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
    console.log(`MoodLens: Scheduler started — Camera/UI: ${THRESHOLDS.CAMERA_FPS} FPS, ML: ${THRESHOLDS.ML_INFERENCE_FPS} FPS`);
  }

  /**
   * Stop the loop.
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.callbacks = null;
    this.inferenceLatencies = [];
    this.renderLatencies = [];
  }

  /**
   * Get performance diagnostics.
   */
  public getDiagnostics(): {
    avgInferenceMs: number;
    avgRenderMs: number;
    totalFrames: number;
    isInferenceRunning: boolean;
    effectiveInferenceFPS: number;
  } {
    return {
      avgInferenceMs: this.average(this.inferenceLatencies),
      avgRenderMs: this.average(this.renderLatencies),
      totalFrames: this.frameCount,
      isInferenceRunning: this.isInferenceRunning,
      effectiveInferenceFPS: this.inferenceLatencies.length > 0
        ? 1000 / this.average(this.inferenceLatencies)
        : 0,
    };
  }

  /**
   * Dynamically adjust the ML inference rate.
   * Useful if the device is too slow for 15 FPS inference.
   */
  public setInferenceFPS(fps: number): void {
    this.inferenceIntervalMs = 1000 / Math.max(1, Math.min(30, fps));
  }

  /** Check if the scheduler is currently running */
  public isActive(): boolean {
    return this.isRunning;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private trackLatency(buffer: number[], value: number): void {
    buffer.push(value);
    // Keep last 60 samples
    if (buffer.length > 60) buffer.shift();

    // Dynamically adapt ML inference rate if device CPU is under heavy compute load
    // Prevents 100% main thread starvation that triggers Chrome's RESULT_CODE_HUNG
    if (buffer === this.inferenceLatencies && buffer.length >= 8) {
      const avg = this.average(buffer);
      if (avg > 70) {
        this.inferenceIntervalMs = Math.max(110, avg + 30);
      } else if (avg < 40) {
        this.inferenceIntervalMs = 1000 / THRESHOLDS.ML_INFERENCE_FPS;
      }
    }
  }

  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}
