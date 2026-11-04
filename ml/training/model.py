"""
MoodLens ML - MobileNetV3-Large Facial Expression Classifier
Pretrained backbone with 7-class linear head.
"""
import torch
import torch.nn as nn
from torchvision.models import mobilenet_v3_large, MobileNet_V3_Large_Weights


class ExpressionClassifier(nn.Module):
    def __init__(self, num_classes: int = 7, pretrained: bool = True, dropout: float = 0.3):
        super().__init__()
        weights = None
        if pretrained:
            try:
                weights = MobileNet_V3_Large_Weights.DEFAULT
                self.backbone = mobilenet_v3_large(weights=weights)
            except Exception as e:
                print(f"Notice: Pretrained weights download unavailable ({e}), initializing standard MobileNetV3 architecture.")
                self.backbone = mobilenet_v3_large(weights=None)
        else:
            self.backbone = mobilenet_v3_large(weights=None)
        
        # Replace the final linear layer with 7-class classification head
        in_features = self.backbone.classifier[3].in_features
        self.backbone.classifier[3] = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(in_features, num_classes)
        )
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)


def get_model(num_classes: int = 7, pretrained: bool = True) -> ExpressionClassifier:
    return ExpressionClassifier(num_classes=num_classes, pretrained=pretrained)
