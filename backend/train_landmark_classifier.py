import os
import time
import pickle
import numpy as np
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

LABELS = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", 
    "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "del", "nothing", "space"
]

def normalize_landmarks(landmarks):
    coords = np.array([[lm.x, lm.y, lm.z] for lm in landmarks])
    # Wrist is index 0
    wrist = coords[0]
    coords = coords - wrist
    # Scale by distance from wrist (0) to middle finger base (9)
    scale = np.linalg.norm(coords[9])
    if scale > 1e-5:
        coords = coords / scale
    return coords.flatten()

def main():
    print("🚀 Starting ASL 3D Landmark Feature Extraction...")
    model_path = 'hand_landmarker.task'
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.HandLandmarkerOptions(base_options=base_options, num_hands=1)
    detector = vision.HandLandmarker.create_from_options(options)

    dataset_dir = os.path.expanduser('~/.cache/kagglehub/datasets/grassknoted/asl-alphabet/versions/1/asl_alphabet_train/asl_alphabet_train')
    
    X = []
    y = []

    start_time = time.time()
    for label_idx, label in enumerate(LABELS):
        folder = os.path.join(dataset_dir, label)
        if not os.path.exists(folder):
            print(f"⚠️ Warning: folder not found {folder}")
            continue
        
        # Take 150 images per class
        images = sorted(os.listdir(folder))[:150]
        detected_in_class = 0
        for name in images:
            img_path = os.path.join(folder, name)
            img = cv2.imread(img_path)
            if img is None:
                continue
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = detector.detect(mp_image)
            if result.hand_landmarks and len(result.hand_landmarks) > 0:
                features = normalize_landmarks(result.hand_landmarks[0])
                X.append(features)
                y.append(label_idx)
                detected_in_class += 1
        print(f"   [{label}]: extracted {detected_in_class} hand pose landmarks")

    X = np.array(X)
    y = np.array(y)
    print(f"\n✅ Extracted {len(X)} total landmark feature vectors in {time.time() - start_time:.1f} seconds.")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42, stratify=y)

    print("\n🧠 Training Random Forest Classifier on 3D Landmark Poses...")
    rf = RandomForestClassifier(n_estimators=200, max_depth=25, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    rf_acc = accuracy_score(y_test, rf.predict(X_test))
    print(f"🎯 Random Forest Test Accuracy: {rf_acc * 100:.2f}%")

    print("\n🧠 Training Multi-Layer Perceptron (MLP) on 3D Landmark Poses...")
    mlp = MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=300, random_state=42)
    mlp.fit(X_train, y_train)
    mlp_acc = accuracy_score(y_test, mlp.predict(X_test))
    print(f"🎯 MLP Test Accuracy: {mlp_acc * 100:.2f}%")

    best_model = rf if rf_acc >= mlp_acc else mlp
    best_name = "RandomForest" if rf_acc >= mlp_acc else "MLP"
    print(f"\n🏆 Best Landmark Classifier: {best_name} (Accuracy: {max(rf_acc, mlp_acc)*100:.2f}%)")

    save_path = os.path.join("model", "landmark_classifier.pkl")
    with open(save_path, "wb") as f:
        pickle.dump({"model": best_model, "labels": LABELS}, f)
    print(f"✅ Saved Landmark Classifier to {save_path}")

if __name__ == "__main__":
    main()
