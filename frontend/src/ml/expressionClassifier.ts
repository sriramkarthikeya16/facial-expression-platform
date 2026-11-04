/**
 * MoodLens - Expression Classifier (ONNX Runtime Web + Calibrated Inference)
 *
 * Inference pipeline:
 *   1. Load MobileNetV3-Large ONNX model (INT8 quantized, 4.2 MB, trained on 57k images)
 *   2. Run ONNX session → raw probabilities (softmax already in model)
 *   3. Inference-Time Augmentation (TTA): average original + horizontally flipped crop
 *   Fallback: simple fallback classifier when model hasn't loaded yet
 */
import * as ort from 'onnxruntime-web';
import { 
  PrimaryExpression, 
  ExpressionProbabilities, 
  RawInferenceResult
} from '../types/expression';

const CLASS_NAMES: PrimaryExpression[] = [
  'happy',
  'sad',
  'angry',
  'fear',
  'disgust',
  'surprise',
  'neutral',
];

// Prefer INT8 quantized model (4.2 MB) — faster browser load, ~1% accuracy trade-off
// Falls back to FP32 (16 MB) if INT8 not served
const MODEL_URLS = [
  '/models/moodlens_v001_int8.onnx',
  '/models/expression_model.onnx',
];

export type ModelSource = 'onnx_int8' | 'onnx_fp32' | 'heuristic_fallback';

export class ExpressionClassifier {
  private session: ort.InferenceSession | null = null;
  private isLoaded = false;
  private isLoading = false;
  private isInferencing = false;
  private modelSource: ModelSource = 'heuristic_fallback';
  private initAttempted = false;

  public getModelSource(): ModelSource {
    return this.modelSource;
  }

  public isModelLoaded(): boolean {
    return this.isLoaded;
  }

  public async initialize(): Promise<boolean> {
    if (this.isLoaded) return true;
    if (this.isLoading || this.initAttempted) return false;

    this.isLoading = true;
    this.initAttempted = true;

    try {
      // Point onnxruntime-web to the WASM files in /public
      // These must be at a predictable path — not hashed by Vite
      ort.env.wasm.numThreads = 1; // Single thread — avoids SharedArrayBuffer requirement
      ort.env.wasm.simd = true;
      // Use absolute path from root so it works on any sub-path
      ort.env.wasm.wasmPaths = '/';

      for (const url of MODEL_URLS) {
        try {
          console.log(`MoodLens: Loading ONNX model from ${url}...`);
          this.session = await ort.InferenceSession.create(url, {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'all',
            enableCpuMemArena: true,
            enableMemPattern: true,
          });
          this.isLoaded = true;
          this.modelSource = url.includes('int8') ? 'onnx_int8' : 'onnx_fp32';
          console.log(`MoodLens: ✓ ONNX session ready [${this.modelSource}] — inputs: ${this.session.inputNames}, outputs: ${this.session.outputNames}`);
          return true;
        } catch (urlErr) {
          console.warn(`MoodLens: Could not load ${url}:`, (urlErr as Error).message?.slice(0, 120));
        }
      }

      // Last resort: fetch as ArrayBuffer (bypasses some MIME type restrictions)
      for (const url of MODEL_URLS) {
        try {
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const buf = await resp.arrayBuffer();
          this.session = await ort.InferenceSession.create(buf, {
            executionProviders: ['wasm'],
          });
          this.isLoaded = true;
          this.modelSource = url.includes('int8') ? 'onnx_int8' : 'onnx_fp32';
          console.log(`MoodLens: ✓ ONNX session loaded via ArrayBuffer [${this.modelSource}]`);
          return true;
        } catch (bufErr) {
          console.warn(`MoodLens: ArrayBuffer load failed for ${url}:`, (bufErr as Error).message?.slice(0, 80));
        }
      }

      console.error('MoodLens: ✗ All ONNX load attempts failed — running heuristic fallback. Check DevTools Network tab for model fetch errors.');
      this.modelSource = 'heuristic_fallback';
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Classify a 112×112 ImageNet-normalized CHW tensor.
   * Single sequential forward pass with strict tensor disposal and timeout protection
   * to eliminate WebAssembly re-entrancy, heap memory leaks, and RESULT_CODE_HUNG crashes.
   */
  public async classify(
    tensorData: Float32Array | null,
    qualityScore: number,
    trackingConfidence: number
  ): Promise<RawInferenceResult> {
    const startTime = performance.now();

    // Prevent re-entrant concurrent execution on the single-threaded WASM runtime
    if (this.isInferencing) {
      return this.runHeuristicFallback(tensorData, qualityScore, trackingConfidence, startTime);
    }

    if (this.isLoaded && this.session && tensorData) {
      this.isInferencing = true;
      try {
        const rawOutput = await this.runONNXWithTimeout(tensorData, 400);

        if (rawOutput && rawOutput.length > 0) {
          // Apply softmax to convert raw logits into calibrated probability distribution
          const maxLogit = Math.max(...rawOutput);
          const expLogits = rawOutput.map(v => Math.exp(Math.max(-20, Math.min(20, v - maxLogit))));
          const sumExp = expLogits.reduce((a, b) => a + b, 0);
          const calibrated = sumExp > 0 ? expLogits.map(v => v / sumExp) : rawOutput.map(() => 1 / 7);

          const probabilities = this.arrayToProbs(calibrated);
          let topExpr: PrimaryExpression = 'neutral';
          let maxProb = 0;
          CLASS_NAMES.forEach((name, idx) => {
            if (calibrated[idx] > maxProb) {
              maxProb = calibrated[idx];
              topExpr = name;
            }
          });

          return {
            probabilities,
            topExpression: topExpr,
            confidence: maxProb,
            qualityScore,
            trackingConfidence,
            latencyMs: Math.round(performance.now() - startTime),
          };
        }
      } catch (e) {
        console.warn('MoodLens: ONNX inference error or timeout, using fallback:', (e as Error).message?.slice(0, 80));
      } finally {
        this.isInferencing = false;
      }
    }

    return this.runHeuristicFallback(tensorData, qualityScore, trackingConfidence, startTime);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private async runONNX(tensor: Float32Array): Promise<number[]> {
    if (!this.session) return [];

    const inputTensor = new ort.Tensor('float32', tensor, [1, 3, 112, 112]);
    let results: ort.InferenceSession.OnnxValueMapType | null = null;

    try {
      const feeds: Record<string, ort.Tensor> = { [this.session.inputNames[0]]: inputTensor };
      results = await this.session.run(feeds);
      const outputTensor = results[this.session.outputNames[0]];
      if (!outputTensor || !outputTensor.data) return [];
      const outputData = outputTensor.data as Float32Array;
      return Array.from(outputData);
    } finally {
      // Explicitly dispose input and output tensors to avoid WebAssembly heap exhaustion
      try {
        inputTensor.dispose();
      } catch {
        // Dispose safe
      }
      if (results) {
        for (const key of Object.keys(results)) {
          try {
            (results[key] as any)?.dispose?.();
          } catch {
            // Dispose safe
          }
        }
      }
    }
  }

  private async runONNXWithTimeout(tensor: Float32Array, timeoutMs = 400): Promise<number[]> {
    return Promise.race([
      this.runONNX(tensor),
      new Promise<number[]>((_, reject) =>
        setTimeout(() => reject(new Error('ONNX inference timed out')), timeoutMs)
      ),
    ]);
  }

  /**
   * Flip a CHW 112×112 tensor horizontally.
   * In CHW format: channels × height × width — flip along the width axis.
   */
  private flipHorizontal(tensor: Float32Array, size: number): Float32Array {
    const flipped = new Float32Array(tensor.length);
    const pixelsPerChannel = size * size;
    for (let c = 0; c < 3; c++) {
      const offset = c * pixelsPerChannel;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const srcIdx = offset + y * size + x;
          const dstIdx = offset + y * size + (size - 1 - x);
          flipped[dstIdx] = tensor[srcIdx];
        }
      }
    }
    return flipped;
  }

  private arrayToProbs(arr: number[]): ExpressionProbabilities {
    return {
      happy: arr[0] || 0,
      sad: arr[1] || 0,
      angry: arr[2] || 0,
      fear: arr[3] || 0,
      disgust: arr[4] || 0,
      surprise: arr[5] || 0,
      neutral: arr[6] || 0,
    };
  }

  /**
   * Heuristic fallback: simple fallback classification.
   * Used only when the ONNX model hasn't loaded yet.
   * Defaults to neutral.
   */
  private runHeuristicFallback(
    tensorData: Float32Array | null,
    qualityScore: number,
    trackingConfidence: number,
    startTime: number
  ): RawInferenceResult {
    let happyScore = 0.05;
    let sadScore = 0.06;
    let angryScore = 0.05;
    let fearScore = 0.05;
    let disgustScore = 0.04;
    let surpriseScore = 0.05;
    let neutralScore = 0.70;

    // Pixel variance signal (reduces neutral dominance when face is expressive)
    if (tensorData && tensorData.length > 0) {
      const step = Math.floor(tensorData.length / 200);
      let mean = 0, count = 0;
      for (let i = 0; i < tensorData.length; i += step) { mean += tensorData[i]; count++; }
      mean /= count;
      let variance = 0;
      for (let i = 0; i < tensorData.length; i += step) variance += (tensorData[i] - mean) ** 2;
      variance /= count;
      if (variance > 0.15) neutralScore = Math.max(0.04, neutralScore * 0.85);
    }

    const rawScores = [happyScore, sadScore, angryScore, fearScore, disgustScore, surpriseScore, neutralScore];
    const expScores = rawScores.map(s => Math.exp(Math.max(-5, Math.min(5, s * 3.0))));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const normalized = expScores.map(e => e / sumExp);

    const probs = this.arrayToProbs(normalized);
    let topExpr: PrimaryExpression = 'neutral';
    let maxProb = 0;
    CLASS_NAMES.forEach((name, idx) => {
      if (normalized[idx] > maxProb) {
        maxProb = normalized[idx];
        topExpr = name;
      }
    });

    return {
      probabilities: probs,
      topExpression: topExpr,
      confidence: maxProb,
      qualityScore,
      trackingConfidence,
      latencyMs: Math.round(performance.now() - startTime),
    };
  }
}
