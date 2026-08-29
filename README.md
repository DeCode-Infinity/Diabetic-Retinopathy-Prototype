# 🩺 Diabetic Retinopathy Screening System

![Python](https://img.shields.io/badge/Python-3.9+-blue?logo=python)
![PyTorch](https://img.shields.io/badge/PyTorch-DeepLearning-red?logo=pytorch)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)
![Docker](https://img.shields.io/badge/Docker-Containerization-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-Proprietary-critical)
![Status](https://img.shields.io/badge/Status-Private-important)

An end-to-end deep learning pipeline for **automated diabetic retinopathy detection** using retinal fundus images.  
This project integrates **data engineering, model training, segmentation, MLOps, backend APIs, and frontend visualization**.

---

## 🚀 Features

- 📊 Data preprocessing with CLAHE & Retinex  
- 🧠 Deep learning classification (EfficientNet / ResNet)  
- 🔬 Medical image segmentation (vessels, optic disc, microaneurysms)  
- 📈 Experiment tracking with Weights & Biases (WandB)  
- ⚡ FastAPI-based model serving  
- 🌐 Interactive React/Next.js dashboard  
- 🔍 Explainability with Grad-CAM  
- 🐳 Dockerized deployment  

---

## 👥 Team Structure

| Member | Role | Responsibilities |
|--------|------|------------------|
| Member 1 | Data Engineer | Dataset download, preprocessing pipeline, augmentation |
| Member 2 | ML Engineer (Training) | Model architecture, training loop, loss functions, checkpointing |
| Member 3 | ML Engineer (Segmentation) | Vessel segmentation, optic disc, microaneurysm detection |
| Member 4 | MLOps + Backend | FastAPI, model serving, WandB tracking, Docker |
| Member 5 | Frontend Developer | React/Next.js dashboard, image upload, results display |
| Member 6 | Team Lead + Integration | Git management, API integration, demo, documentation |

---

## 📁 Project Structure
``` text

dr_screening/
│
├── 📂 data/
│   ├── raw/                    ← Original downloaded datasets
│   ├── processed/              ← CLAHE enhanced images
│   ├── splits/                 ← train.csv, val.csv, test.csv
│   └── augmented/              ← Augmented training data
│
├── 📂 src/
│   ├── 📂 data/
│   │   ├── __init__.py
│   │   ├── dataset.py          ← PyTorch Dataset class
│   │   ├── preprocessing.py    ← CLAHE, Retinex, quality check
│   │   └── augmentation.py     ← Albumentations pipeline
│   │
│   ├── 📂 models/
│   │   ├── __init__.py
│   │   ├── classifier.py       ← EfficientNet/ResNet architecture
│   │   ├── segmentation.py     ← Frangi, Active Contours
│   │   └── losses.py           ← Focal loss, Dice loss
│   │
│   ├── 📂 training/
│   │   ├── train.py            ← Main training script
│   │   ├── trainer.py          ← Trainer class
│   │   ├── evaluate.py         ← Clinical metrics
│   │   └── callbacks.py        ← Early stop, LR schedule
│   │
│   ├── 📂 explainability/
│   │   ├── gradcam.py          ← Grad-CAM implementation
│   │   └── calibration.py      ← Temperature/Platt scaling
│   │
│   └── 📂 api/
│       ├── main.py             ← FastAPI app
│       ├── schemas.py          ← Pydantic models
│       └── inference.py        ← Inference pipeline
│
├── 📂 frontend/                ← React app
│   ├── src/
│   │   ├── components/
│   │   └── pages/
│   └── package.json
│
├── 📂 notebooks/
│   ├── 01_eda.ipynb
│   ├── 02_preprocessing_analysis.ipynb
│   └── 03_model_evaluation.ipynb
│
├── 📂 configs/
│   └── config.yaml             ← Sab hyperparameters yahan
│
├── 📂 checkpoints/             ← Saved model weights
├── 📂 tests/                   ← Unit tests
├── 📂 docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```
---

## ⚙️ Installation

```bash
git clone https://github.com/your-username/dr_screening.git
cd dr_screening

pip install -r requirements.txt

---

🧪 Training

python src/training/train.py --config configs/config.yaml

---

📊 Evaluation

python src/training/evaluate.py

---

🔍 Inference API (FastAPI)

uvicorn src.api.main:app --reload

API Docs:
👉 http://127.0.0.1:8000/docs

---

🌐 Frontend

cd frontend
npm install
npm run dev

---

🐳 Docker Deployment

docker-compose up --build

---

📈 Explainability

- Grad-CAM visualizations for model decisions
- Calibration (Temperature / Platt scaling) for reliable probabilities

---

📌 Future Improvements

- Multi-class DR grading (0–4 severity levels)
- Mobile deployment
- Clinical validation pipeline

---

🔒 License (Proprietary)

All Rights Reserved

Copyright (c) 2026 Team Decode-Infinity 

This project and its source code are the intellectual property of the author.
Unauthorized copying, distribution, modification, or use of this code,
in whole or in part, is strictly prohibited without prior written permission.

This software is provided for private use only and may not be shared publicly.

---

🙌 Acknowledgements

- Open-source medical imaging datasets
- PyTorch & FastAPI community
- Weights & Biases for experiment tracking

---
