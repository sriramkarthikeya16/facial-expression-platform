"""
MoodLens ML - Confidence Calibration via Temperature Scaling
"""
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader


class ModelWithTemperature(nn.Module):
    """
    A thin decorator, which takes a model and puts a learnable
    temperature scale parameter over the output logits.
    """
    def __init__(self, model: nn.Module):
        super().__init__()
        self.model = model
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)

    def forward(self, input: torch.Tensor) -> torch.Tensor:
        logits = self.model(input)
        return self.temperature_scale(logits)

    def temperature_scale(self, logits: torch.Tensor) -> torch.Tensor:
        temperature = self.temperature.unsqueeze(1).expand(logits.size(0), logits.size(1))
        return logits / temperature

    def set_temperature(self, valid_loader: DataLoader, device: torch.device):
        """
        Tune the temperature of the model using validation data.
        """
        self.to(device)
        self.eval()
        nll_criterion = nn.CrossEntropyLoss().to(device)
        
        logits_list = []
        labels_list = []
        with torch.no_grad():
            for input, label in valid_loader:
                input = input.to(device)
                logits = self.model(input)
                logits_list.append(logits)
                labels_list.append(label)
            logits = torch.cat(logits_list).to(device)
            labels = torch.cat(labels_list).to(device)

        # Optimize temperature parameter
        optimizer = optim.LBFGS([self.temperature], lr=0.01, max_iter=50)

        def eval():
            optimizer.zero_grad()
            loss = nll_criterion(self.temperature_scale(logits), labels)
            loss.backward()
            return loss

        optimizer.step(eval)
        print(f"Optimal Temperature: {self.temperature.item():.4f}")
        return self.temperature.item()
