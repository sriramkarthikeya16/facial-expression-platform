"""
MoodLens ML - Evaluation Script
Evaluates model performance on the test split and generates detailed metrics.
"""
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix, balanced_accuracy_score, f1_score
from torch.utils.data import DataLoader

from ml.training.model import get_model
from ml.training.train import EmotionDataset, get_transforms, TARGET_CLASSES, CLASS_TO_IDX


def evaluate():
    device = torch.device("mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu")
    print(f"Evaluating on device: {device}")
    
    _, test_transform = get_transforms(img_size=112)
    test_csv = PROJECT_ROOT / "dataset" / "splits" / "test.csv"
    
    if not test_csv.exists():
        print(f"Error: {test_csv} does not exist. Run prepare_datasets.py first.")
        return
        
    test_dataset = EmotionDataset(test_csv, transform=test_transform)
    test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False)
    
    model = get_model(num_classes=7, pretrained=False).to(device)
    checkpoint_path = PROJECT_ROOT / "ml" / "models" / "best_model.pth"
    
    if checkpoint_path.exists():
        ckpt = torch.load(checkpoint_path, map_location=device)
        model.load_state_dict(ckpt['model_state_dict'])
        print(f"Loaded checkpoint from {checkpoint_path}")
    else:
        print("Warning: No checkpoint found, evaluating initialized model weights.")
        
    model.eval()
    all_preds = []
    all_targets = []
    all_probs = []
    
    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)
            _, preds = torch.max(probs, 1)
            
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(labels.numpy())
            all_probs.extend(probs.cpu().numpy())
            
    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)
    all_probs = np.array(all_probs)
    
    acc = np.mean(all_preds == all_targets) * 100.0
    balanced_acc = balanced_accuracy_score(all_targets, all_preds) * 100.0
    macro_f1 = f1_score(all_targets, all_preds, average='macro')
    weighted_f1 = f1_score(all_targets, all_preds, average='weighted')
    
    print("\n" + "=" * 50)
    print("MOODLENS EVALUATION METRICS")
    print("=" * 50)
    print(f"Overall Accuracy:       {acc:.2f}%")
    print(f"Balanced Accuracy:      {balanced_acc:.2f}%")
    print(f"Macro F1 Score:         {macro_f1:.4f}")
    print(f"Weighted F1 Score:      {weighted_f1:.4f}")
    print("\nClassification Report:")
    print(classification_report(all_targets, all_preds, target_names=TARGET_CLASSES, digits=4))
    print("\nConfusion Matrix:")
    print(confusion_matrix(all_targets, all_preds))
    print("=" * 50)


if __name__ == "__main__":
    evaluate()
