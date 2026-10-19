# ClearFlow Campus Photo Collection Guide

This guide provides instructions for team members collecting real-world site photos to evaluate and retrain the ClearFlow image verification classifier.

---

## 1. Objective
We need representative paired examples of **clean** and **messy/dirty** facility spaces to build a campus validation and held-out benchmark test set for ClearFlow's computer vision service.

---

## 2. Target Categories and Locations
Capture photos across all 6 core facility maintenance service domains:
1. **Cleaning**: Restrooms, corridors, cafeteria dining areas, lecture hall seating, stairwells.
2. **Plumbing**: Sink basins, pipe fittings, drain traps, water fountains, restroom utility lines.
3. **Electrical**: Breaker panels, wiring conduits, light fixtures, switchboards, cable raceways.
4. **Gardening / Grounds**: Lawns, flowerbeds, outdoor walkways, trimmed hedges, perimeter fences.
5. **Waste Management**: Dumpster enclosures, recycling stations, sorting bins, outdoor trash cans.
6. **E-Waste Disposal**: Electronics staging bins, decommissioned PC racks, battery recycling barrels, cable bins.

---

## 3. Sample Size Quotas
- **Per Class**: At least **150 photos** in `clean/` and **150 photos** in `messy/` (minimum 300 photos total).
- **Per Category**: At least **20 photos** per category in each class (e.g. 20 clean plumbing, 20 messy plumbing).

---

## 4. Photography Guidelines
- **Angles and Distances**: Capture varied viewpoints: wide-angle scene shots (2–3 meters back), medium shots (1–2 meters), and close-up task areas (0.5 meters).
- **Lighting Variation**: Include natural daylight, indoor fluorescent lighting, low-light basement/corridor conditions, and night/artificial illumination.
- **Privacy & Compliance**:
  - **NO people, faces, or identifying badges**.
  - **NO computer screens, confidential whiteboards, or paperwork**.
  - **NO license plates or vehicle registrations**.
  - Always obtain explicit permission from the space owner or facility supervisor before photographing restricted areas.

---

## 5. File Naming and Folder Structure
Save all images as standard JPEG format:
- Format: `<category>_<yyyymmdd>_<nnn>.jpg`
- Examples:
  - `cleaning_20261015_001.jpg`
  - `plumbing_20261015_014.jpg`
  - `electrical_20261015_003.jpg`
  - `gardening_20261015_022.jpg`
  - `waste_20261015_008.jpg`
  - `ewaste_20261015_019.jpg`

Place files in the corresponding campus raw data directory:
- Clean photos: `ai-service/data/raw/campus/clean/`
- Messy / dirty photos: `ai-service/data/raw/campus/messy/`

---

## 6. Retraining After Photos Are Collected
Once at least 100 photos per class exist in `ai-service/data/raw/campus/`, run the training script from the `ai-service` directory:

```powershell
.\.venv\Scripts\python.exe scripts\train_classifier.py
```
