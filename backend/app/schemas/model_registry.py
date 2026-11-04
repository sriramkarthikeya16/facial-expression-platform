"""
MoodLens Backend - Model Registry Pydantic Schemas
"""
from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any, Literal


class ModelRegisterRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_id: str
    version: str
    architecture: str = "MobileNetV3-Large"
    quantization: Literal["fp32", "fp16", "int8"] = "fp32"
    format: Literal["onnx", "tflite", "coreml"] = "onnx"
    file_name: str
    sha256_hash: str
    size_bytes: int
    dataset_version: str = "v1.0-balanced"
    accuracy: float
    macro_f1: float
    balanced_accuracy: float
    expected_calibration_error: float
    metrics_json: Dict[str, Any] = {}
    benchmarks_json: Dict[str, Any] = {}
    is_active: bool = False
    is_fallback: bool = False
    rollback_version: Optional[str] = None


class ModelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    model_id: str
    version: str
    architecture: str
    quantization: str
    format: str
    file_name: str
    sha256_hash: str
    size_bytes: int
    dataset_version: str
    accuracy: float
    macro_f1: float
    balanced_accuracy: float
    expected_calibration_error: float
    metrics_json: Dict[str, Any]
    benchmarks_json: Dict[str, Any]
    is_active: bool
    is_fallback: bool
    rollback_version: Optional[str]
    created_at: datetime


class ModelRegistryListResponse(BaseModel):
    models: List[ModelResponse]
    active_model_id: Optional[str]
    total: int
