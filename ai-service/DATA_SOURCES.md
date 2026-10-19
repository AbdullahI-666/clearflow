# ClearFlow AI Service Data Sources

This document records the provenance, licensing, counts, and utilization of all external datasets used to train and validate ClearFlow's computer vision verification classifier and service demand forecaster.

---

## 1. Messy vs. Clean Room Dataset
- **Dataset Name**: Messy vs Clean Room Dataset
- **Source Slug / URL**: `cdawn1/messy-vs-clean-room` (https://www.kaggle.com/datasets/cdawn1/messy-vs-clean-room)
- **License**: **UNKNOWN** (No explicit open source license specified in Kaggle dataset metadata or repository)
- **Citation Required**: Guanqiao Ding / Kaggle user `cdawn1` (Messy Room Classifier project)
- **Download Date**: 2026-10-15
- **Image Count**:
  - **Clean (Class 1)**: 106 images (96 train + 10 validation)
  - **Messy (Class 0)**: 106 images (96 train + 10 validation)
  - **Unlabeled Test**: 10 images (excluded from supervised training)
  - **Total Labeled**: 212 images
- **Label Mapping**: Inferred directly from directory hierarchy:
  - `train/clean`, `val/clean` -> Label `1` (Clean)
  - `train/messy`, `val/messy` -> Label `0` (Messy / Dirty)
- **Primary Use**: Training and cross-domain validation for indoor facility maintenance verification (cleaning, corridors, offices, rooms).

---

## 2. Clean/Dirty Road Classification Dataset
- **Dataset Name**: Clean/Dirty Road Classification Dataset
- **Source Slug / URL**: `faizalkarim/cleandirty-road-classification` (https://www.kaggle.com/datasets/faizalkarim/cleandirty-road-classification)
- **License**: **CC0: Public Domain** (Dedication to public domain worldwide)
- **Citation Required**: Faizal Karim / Kaggle
- **Download Date**: 2026-10-15
- **Image Count**:
  - **Clean (Class 1)**: 113 images (`clean_*.jpg`)
  - **Dirty / Littered (Class 0)**: 124 images (`dirty_*.jpg`)
  - **Total Labeled**: 237 images
- **Label Mapping**: Inferred from file prefixes:
  - Filename prefix `clean_*` -> Label `1` (Clean)
  - Filename prefix `dirty_*` -> Label `0` (Dirty / Messy)
  *(Note: Original author's metadata.csv used 0=clean, 1=dirty. ClearFlow standardizes on 1=clean, 0=dirty/messy).*
- **Primary Use**: Training and cross-domain validation for outdoor grounds and perimeter cleanliness (gardening, road/pavement litter, waste collection).

---

## 3. NYC 311 Service Requests (Demand Forecasting Proxy)
- **Dataset Name**: NYC 311 Service Requests (Daily Volume Proxy)
- **Source URL**: NYC Open Data Socrata API (`https://data.cityofnewyork.us/resource/erm2-nwe9.json`)
- **License**: **NYC Open Data Terms of Use** (Public Open Government Data)
- **Citation Required**: City of New York Open Data (NYC 311)
- **Download Date**: 2026-10-15
- **Record Span**: Daily aggregated incident counts over a 24-month historical span (October 2024 to October 2026)
- **Proxy Disclaimer**: NYC 311 municipal data is used as a realistic public proxy for facility service demand rhythms (weekly seasonality, seasonal drift). It does not reflect proprietary campus or corporate facility internal volumes.
- **Category Mapping**:
  - **Cleaning / Sanitation**: `Sanitation Condition`, `Dirty Condition`, `Graffiti`
  - **Plumbing / Water**: `Water System`, `Plumbing`, `Sewer`
  - **Electrical**: `Street Light Condition`, `Traffic Signal Condition`, `Electrical`
  - **Pest Control**: `Rodent`, `Pest Control`
  - **Gardening / Grounds**: `Damaged Tree`, `Overgrown Tree/Branches`
  - **General Waste**: `Missed Collection`, `Illegal Dumping`
- **Primary Use**: Training ClearFlow's 7-day workload prediction model (`forecaster_v1.joblib`).

---

## 4. Garbage Classification Dataset (TrashNet)
- **Dataset Name**: Garbage Classification (TrashNet)
- **Source Slug / URL**: `asdasdasasdas/garbage-classification` (https://www.kaggle.com/datasets/asdasdasasdas/garbage-classification)
- **License**: **CC0: Public Domain** / Open Research
- **Citation Required**: Gary Thung, Mindy Yang / Stanford CS229 TrashNet
- **Download Date**: 2026-10-19
- **Image Count**:
  - `cardboard`: 403 images
  - `glass`: 501 images
  - `metal`: 410 images
  - `paper`: 594 images
  - `plastic`: 482 images
  - `trash`: 137 images
  - **Total Labeled**: 2,527 images
- **Label Mapping**:
  - `trash` & discarded packaging -> Label `0` (Dirty / Messy / Waste Accumulated)
- **Primary Use**: General waste collection verification, recyclable vs. non-recyclable sorting, and grounds litter detection.

---

## 5. Multi-Class Waste & Battery E-Waste Dataset
- **Dataset Name**: Garbage Classification (12 Classes including Batteries & Tech Waste)
- **Source Slug / URL**: `mostafaabla/garbage-classification` (https://www.kaggle.com/datasets/mostafaabla/garbage-classification)
- **License**: **CC0: Public Domain**
- **Citation Required**: Mostafa Mohamed (`mostafaabla`) / Kaggle
- **Download Date**: 2026-10-19
- **Image Count**:
  - `battery` (E-Waste): 945 images
  - `biological`: 985 images
  - `brown-glass`: 607 images
  - `white-glass`: 775 images
  - `green-glass`: 629 images
  - `cardboard`: 891 images
  - `clothes`: 5,325 images
  - `shoes`: 1,977 images
  - `metal`: 769 images
  - `paper`: 1,050 images
  - `plastic`: 865 images
  - `trash`: 697 images
  - **Total Labeled**: 15,115 images
- **Primary Use**: E-Waste recycling verification (hazardous battery disposal) and heavy facility waste sorting.

