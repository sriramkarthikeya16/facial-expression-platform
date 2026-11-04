#!/usr/bin/env bash
# ==============================================================================
# MoodLens - End-to-End ML Pipeline Runner
# Prepares data, trains/evaluates MobileNetV3, exports quantized ONNX models,
# and deploys models directly to the web frontend public assets.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"
export PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH:-}"

echo "================================================================="
echo " MoodLens: End-to-End Machine Learning Pipeline"
echo "================================================================="

# 1. Activate Python virtual environment
if [ -d ".venv" ]; then
    echo "• Activating virtual environment (.venv)..."
    source .venv/bin/activate
else
    echo "⚠ Virtual environment (.venv) not found. Using system Python."
fi

# 2. Check dataset splits
if [ ! -f "dataset/splits/train.csv" ]; then
    echo "• Dataset splits not found. Running prepare_datasets.py..."
    python3 ml/preprocessing/prepare_datasets.py
else
    echo "✓ Dataset splits exist (train: $(wc -l < dataset/splits/train.csv) samples)."
fi

# 3. Model Training / Fine-Tuning
EPOCHS="${1:-10}"
BATCH_SIZE="${2:-64}"
if [ "${EPOCHS}" -gt 0 ]; then
    echo "• Running training (Epochs: ${EPOCHS}, Batch Size: ${BATCH_SIZE}, Resume: true)..."
    python3 ml/training/train.py --epochs "${EPOCHS}" --batch_size "${BATCH_SIZE}" --resume
else
    echo "• Skipping training (EPOCHS=0)... using existing checkpoint."
fi

# 4. Evaluation on held-out test split
echo "• Evaluating model on test split..."
python3 ml/evaluation/evaluate.py

# 5. Export FP32, FP16, and INT8 ONNX models
echo "• Exporting and quantizing ONNX models..."
python3 ml/export/export_quantized.py

# 6. Deploy to frontend public assets
echo "• Deploying models to frontend/public/models/..."
mkdir -p frontend/public/models/
cp ml/models/moodlens_v001_int8.onnx frontend/public/models/moodlens_v001_int8.onnx
cp ml/models/moodlens_v001_fp32.onnx frontend/public/models/expression_model.onnx
echo "✓ Models deployed to frontend/public/models/:"
ls -lh frontend/public/models/*.onnx

# 7. Verify frontend compilation
echo "• Verifying frontend build..."
(cd frontend && npm run build)

echo "================================================================="
echo "✓ MoodLens ML Pipeline completed successfully!"
echo "================================================================="
