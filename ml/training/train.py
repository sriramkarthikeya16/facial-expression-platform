"""
MoodLens ML - Training Script
Trains MobileNetV3 on the processed emotion dataset splits.
"""
import os
import sys
import argparse
from pathlib import Path
from tqdm import tqdm

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pandas as pd
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T

from ml.training.model import get_model

TARGET_CLASSES = ["happy", "sad", "angry", "fear", "disgust", "surprise", "neutral"]
CLASS_TO_IDX = {cls: idx for idx, cls in enumerate(TARGET_CLASSES)}


class EmotionDataset(Dataset):
    def __init__(self, csv_file: Path, transform=None):
        self.df = pd.read_csv(csv_file)
        self.transform = transform
        
    def __len__(self):
        return len(self.df)
        
    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        image_path = row['image_path']
        label = row['label']
        label_idx = CLASS_TO_IDX[label]
        
        try:
            image = Image.open(image_path).convert("RGB")
        except Exception:
            # Fallback black image if corrupted
            image = Image.new("RGB", (112, 112), color=0)
            
        if self.transform:
            image = self.transform(image)
            
        return image, torch.tensor(label_idx, dtype=torch.long)


def get_transforms(img_size: int = 112):
    train_transform = T.Compose([
        T.Resize((img_size, img_size)),
        T.RandomHorizontalFlip(),
        T.RandomRotation(15),
        T.ColorJitter(brightness=0.2, contrast=0.2),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        T.RandomErasing(p=0.2, scale=(0.02, 0.2), value="random"),
    ])
    
    val_transform = T.Compose([
        T.Resize((img_size, img_size)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    return train_transform, val_transform


def train(args):
    device = torch.device("mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    train_transform, val_transform = get_transforms(args.img_size)
    
    splits_dir = PROJECT_ROOT / "dataset" / "splits"
    train_csv = splits_dir / "train.csv"
    val_csv = splits_dir / "val.csv"

    if not train_csv.exists() or not val_csv.exists():
        print(f"Error: Split manifests not found at {splits_dir}. Run prepare_datasets.py first.")
        return

    train_dataset = EmotionDataset(train_csv, transform=train_transform)
    val_dataset = EmotionDataset(val_csv, transform=val_transform)
    
    # Class weights for loss function
    train_labels = train_dataset.df['label'].map(CLASS_TO_IDX).values
    class_counts = np.bincount(train_labels, minlength=7)
    total_samples = len(train_labels)
    class_weights = total_samples / (7.0 * np.maximum(class_counts, 1))
    weight_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)
    
    is_cuda = device.type == "cuda"
    train_loader = DataLoader(
        train_dataset, 
        batch_size=args.batch_size, 
        shuffle=True, 
        num_workers=args.num_workers, 
        pin_memory=is_cuda
    )
    val_loader = DataLoader(
        val_dataset, 
        batch_size=args.batch_size, 
        shuffle=False, 
        num_workers=args.num_workers, 
        pin_memory=is_cuda
    )
    
    model = get_model(num_classes=7, pretrained=True).to(device)
    models_dir = PROJECT_ROOT / "ml" / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    best_acc = 0.0

    if getattr(args, "resume", False):
        ckpt_path = models_dir / "best_model.pth"
        if ckpt_path.exists():
            print(f"Resuming/fine-tuning from existing checkpoint: {ckpt_path}")
            ckpt = torch.load(ckpt_path, map_location=device)
            model.load_state_dict(ckpt['model_state_dict'])
            best_acc = ckpt.get('best_acc', 0.0)
            print(f"Loaded checkpoint with baseline accuracy: {best_acc:.2f}%")

    criterion = nn.CrossEntropyLoss(weight=weight_tensor, label_smoothing=0.1)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)
    
    print(f"\nStarting training on {len(train_dataset)} train samples, {len(val_dataset)} validation samples...")
    print(f"Total Epochs: {args.epochs} | Batch Size: {args.batch_size} | Learning Rate: {args.lr}\n")

    for epoch in range(args.epochs):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        train_pbar = tqdm(train_loader, desc=f"Epoch {epoch+1:02d}/{args.epochs:02d} [Train]", leave=False)
        for images, labels in train_pbar:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            batch_size = labels.size(0)
            running_loss += loss.item() * batch_size
            _, predicted = outputs.max(1)
            total += batch_size
            correct += predicted.eq(labels).sum().item()
            
            curr_acc = 100.0 * correct / total
            curr_loss = running_loss / total
            train_pbar.set_postfix({"loss": f"{curr_loss:.4f}", "acc": f"{curr_acc:.2f}%"})
            
        train_acc = 100.0 * correct / total
        train_loss = running_loss / total
        
        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        val_pbar = tqdm(val_loader, desc=f"Epoch {epoch+1:02d}/{args.epochs:02d} [Val]  ", leave=False)
        with torch.no_grad():
            for images, labels in val_pbar:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                
                batch_size = labels.size(0)
                val_loss += loss.item() * batch_size
                _, predicted = outputs.max(1)
                val_total += batch_size
                val_correct += predicted.eq(labels).sum().item()
                
                curr_val_acc = 100.0 * val_correct / val_total
                curr_val_loss = val_loss / val_total
                val_pbar.set_postfix({"loss": f"{curr_val_loss:.4f}", "acc": f"{curr_val_acc:.2f}%"})
                
        val_acc = 100.0 * val_correct / val_total
        val_loss = val_loss / val_total
        
        scheduler.step()
        
        status_msg = f"Epoch {epoch+1:02d}/{args.epochs:02d} | Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}% | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%"
        
        if val_acc > best_acc:
            best_acc = val_acc
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'best_acc': best_acc,
            }, models_dir / "best_model.pth")
            print(f"{status_msg}  --> [Saved best checkpoint: {val_acc:.2f}%]")
        else:
            print(status_msg)
            
    print(f"\n============================================================")
    print(f"Training completed! Best Validation Accuracy: {best_acc:.2f}%")
    print(f"Model saved to: {models_dir / 'best_model.pth'}")
    print(f"============================================================\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train MoodLens Expression Classifier")
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch_size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--img_size", type=int, default=112)
    parser.add_argument("--num_workers", type=int, default=0)
    parser.add_argument("--resume", action="store_true", help="Resume/fine-tune from best_model.pth")
    args = parser.parse_args()
    train(args)

