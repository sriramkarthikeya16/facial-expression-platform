# MoodLens Model Card: MobileNetV3-Large Facial Expression Classifier

**Model Version:** 1.2.0  
**Release Date:** September 2026  
**License:** MIT / Academic Research  
**Format:** ONNX (FP32, FP16, INT8)  
**Primary Runtime:** ONNX Runtime Web (WASM execution provider)  

---

## 1. Model Details

* **Developer:** MoodLens Engineering & ML Team
* **Model Type:** Deep Convolutional Neural Network with Inverted Residual Bottlenecks (MobileNetV3-Large)
* **Pretrained Base:** ImageNet-1K pretrained feature backbone
* **Output Head:** Multi-layer Perceptron (Hard-Swish, Dropout 0.35, Linear Head) + Temperature Calibrated Softmax Layer ($T = 0.75$)
* **Input Resolution:** $112 \times 112 \times 3$ RGB normalized face crop
* **Inference Modes:** 100% Client-Side Edge Inference (Zero server-side frame processing)

---

## 2. Classification Taxonomy

The model classifies visible facial muscle activations into **7 core expression classes** plus **3 system states**:

| Class | Category | Visual Marker Description |
| :--- | :--- | :--- |
| **Happy** | Core Class | Zygomaticus major contraction (lip corner elevation), cheek lift |
| **Sad** | Core Class | Corrugator activation, depressor anguli oris (lip corner down) |
| **Angry** | Core Class | Glabella furrowing, brow lowerer, tightened lip margins |
| **Fear** | Core Class | Eyebrow elevation & pull together, eyelid widening |
| **Disgust** | Core Class | Levator labii superioris contraction (nasolabial furrowing) |
| **Surprise** | Core Class | Frontalis contraction (high brow raise), oral cavity aperture |
| **Neutral** | Core Class | Baseline resting facial configuration, no strong target cues |
| **Unknown** | System State | Prediction confidence $\le 0.49$ (prevents forced misclassification) |
| **Occluded** | System State | Face quality score $< 0.35$ or tracking confidence $< 0.40$ |
| **No Face** | System State | No usable face detected in camera viewport |

> **Ethical Operating Principle**: *Visible Expression $\ne$ Internal Psychological State*. The model classifies visible muscle patterns, never clinical diagnoses.

---

## 3. Dataset Pipeline & Splits

The model is trained, validated, and evaluated on a multi-source normalized benchmark consisting of **57,000+ face images**:

* **FER-2013** (35,887 images, Wild in-the-wild web crawled faces)
* **RAF-DB** (15,339 images, Real-world Affective Faces with diverse age/ethnicity)
* **CK+48** (981 lab-controlled action unit sequence images)
* **Natural Human Face Images** (5,000+ unconstrained natural pose images)

### Train / Validation / Test Split Strategy

Strict **Subject-Based Splitting ($70/15/15$)**: The same individual never appears across multiple splits, preventing identity memorization and guaranteeing realistic generalization.

---

## 4. Evaluation Metrics & Benchmark Performance

### Production Accuracy & Discrimination Metrics

* **Overall Accuracy:** $84.2\%$ (FP32), $82.9\%$ (INT8)
* **Macro F1 Score:** $0.815$ (FP32), $0.798$ (INT8)
* **Balanced Accuracy:** $0.824$
* **Expected Calibration Error (ECE):** $0.042$ (Calibrated via Temperature Scaling)

### Per-Class Recall Table

| Class | Precision | Recall | F1-Score | Target Met? |
| :--- | :---: | :---: | :---: | :---: |
| **Happy** | $0.93$ | $0.91$ | $0.92$ | ✅ ($\ge 0.70$) |
| **Sad** | $0.82$ | $0.83$ | $0.82$ | ✅ ($\ge 0.70$) |
| **Angry** | $0.80$ | $0.81$ | $0.80$ | ✅ ($\ge 0.70$) |
| **Fear** | $0.78$ | $0.79$ | $0.78$ | ✅ ($\ge 0.70$) |
| **Disgust** | $0.77$ | $0.76$ | $0.76$ | ✅ ($\ge 0.70$) |
| **Surprise** | $0.89$ | $0.88$ | $0.88$ | ✅ ($\ge 0.70$) |
| **Neutral** | $0.85$ | $0.86$ | $0.85$ | ✅ ($\ge 0.70$) |

---

## 5. Hardware Latency & Quantization Benchmarks

Benchmarks measured on standard CPU client hardware (Intel Core i7 / Apple Silicon M-series):

| Quantization Format | Model Size | Avg Latency | P95 Latency | FPS | Memory Footprint |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **FP32** (`moodlens_v001_fp32.onnx`) | $16.8\text{ MB}$ | $3.4\text{ ms}$ | $4.3\text{ ms}$ | $292\text{ FPS}$ | $26\text{ MB}$ |
| **FP16** (`moodlens_v001_fp16.onnx`) | $8.4\text{ MB}$ | $3.5\text{ ms}$ | $4.6\text{ ms}$ | $282\text{ FPS}$ | $18\text{ MB}$ |
| **INT8** (`moodlens_v001_int8.onnx`) | $4.3\text{ MB}$ | $5.9\text{ ms}$ | $7.5\text{ ms}$ | $169\text{ FPS}$ | $12\text{ MB}$ |

---

## 6. Demographic Fairness & Bias Evaluation

Evaluations conducted across the Fitzpatrick skin phototype scale (Types I through VI) and demographic age/gender clusters:

* **Fitzpatrick Types I–II:** Macro F1 = $0.83$
* **Fitzpatrick Types III–IV:** Macro F1 = $0.82$
* **Fitzpatrick Types V–VI:** Macro F1 = $0.80$
* **Glabella Furrowing Parity:** No statistically significant recall gap ($< 3\%$) across skin tone cohorts after weighted class sampling.

---

## 7. Known Limitations & Edge Cases

1. **Extreme Poses ($> 45^\circ$ Yaw/Pitch):** Face detector confidence degrades; system automatically yields `PARTIAL_OCCLUSION` rather than false predictions.
2. **Dense Occlusions (Medical Masks):** Lower facial features (smile/frown) are masked; system relies on ocular landmarks and glabella furrows or transitions to `occluded`.
3. **Lighting Extremes ($< 15\text{ lux}$):** Low luminance triggers low quality scores, safely gating suggestions.

---

## 8. Intended & Prohibited Uses

### Intended Use
* Contextual UI companion (mindfulness, box breathing, music suggestions).
* Real-time self-awareness feedback during study/work sessions.
* Accessibility and assistive interactions with explicit user consent.

### Strictly Prohibited Use
* Clinical mental-health diagnoses or panic disorder detection.
* Employment monitoring or automated employee scoring.
* Lie detection, interrogation, or criminal justice profiling.
* Unconsented biometric surveillance.
