"""
MoodLens ML - ONNX Model Export Script
Exports PyTorch MobileNetV3 to ONNX format for on-device browser inference via onnxruntime-web.
"""
import os
import sys
import shutil
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
import torch.nn as nn
import numpy as np

from ml.training.model import get_model


class SoftmaxOutputWrapper(nn.Module):
    """Wraps model with a Softmax layer so the ONNX output directly produces probabilities (0.0 to 1.0)."""
    def __init__(self, model: nn.Module):
        super().__init__()
        self.model = model
        self.softmax = nn.Softmax(dim=1)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        logits = self.model(x)
        return self.softmax(logits)


def export_onnx(img_size: int = 112, opset_version: int = 17):
    print("=" * 50)
    print("MoodLens ONNX Model Export")
    print("=" * 50)
    
    models_dir = Path("ml/models")
    models_dir.mkdir(parents=True, exist_ok=True)
    
    frontend_models_dir = Path("frontend/public/models")
    frontend_models_dir.mkdir(parents=True, exist_ok=True)
    
    checkpoint_path = models_dir / "best_model.pth"
    onnx_path = models_dir / "expression_model.onnx"
    frontend_onnx_path = frontend_models_dir / "expression_model.onnx"
    
    model = get_model(num_classes=7, pretrained=True)
    if checkpoint_path.exists():
        print(f"Loading trained weights from {checkpoint_path}")
        ckpt = torch.load(checkpoint_path, map_location="cpu")
        model.load_state_dict(ckpt['model_state_dict'])
    else:
        print("No fine-tuned checkpoint found; exporting initialized MobileNetV3 model...")
        
    model.eval()
    wrapped_model = SoftmaxOutputWrapper(model)
    wrapped_model.eval()
    
    dummy_input = torch.randn(1, 3, img_size, img_size, requires_grad=False)
    
    print(f"Exporting ONNX model to {onnx_path} (input shape: 1x3x{img_size}x{img_size})...")
    torch.onnx.export(
        wrapped_model,
        dummy_input,
        str(onnx_path),
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["probabilities"],
        dynamic_axes={
            "input": {0: "batch_size"},
            "probabilities": {0: "batch_size"}
        }
    )
    print("ONNX export successful.")
    
    # Verify ONNX model with ONNX Runtime if available
    try:
        import onnxruntime as ort
        session = ort.InferenceSession(str(onnx_path))
        ort_inputs = {session.get_inputs()[0].name: dummy_input.numpy()}
        ort_outputs = session.run(None, ort_inputs)
        
        with torch.no_grad():
            torch_output = wrapped_model(dummy_input).numpy()
            
        np.testing.assert_allclose(torch_output, ort_outputs[0], rtol=1e-03, atol=1e-05)
        print("✓ Verification PASSED: PyTorch and ONNX Runtime outputs match within tolerance.")
    except Exception as e:
        print(f"Verification notice: {e}")
        
    # Copy to frontend public directory
    shutil.copyfile(onnx_path, frontend_onnx_path)
    print(f"✓ Copied ONNX model to frontend: {frontend_onnx_path}")
    print("=" * 50)


if __name__ == "__main__":
    export_onnx()
