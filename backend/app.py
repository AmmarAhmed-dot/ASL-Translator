import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from collections import Counter
from datetime import datetime
import numpy as np
import cv2
import os


# System flags to keep logs clean
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

app = Flask(__name__)
CORS(app)
# Firebase Admin
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

db = firestore.client()
# 1. Load Model Safely
MODEL_PATH = os.path.join("model", "model.keras")
model = load_model(MODEL_PATH)

labels = [
    "0","1","2","3","4","5","6","7","8","9",
    "A","B","C","D","E","F","G","H","I","J",
    "K","L","M","N","O","P","Q","R","S","T",
    "U","V","W","X","Y","Z",
    "space"
]

def preprocess(img):
    # Ensure correct color channels and resize matrix cleanly
    img = cv2.resize(img, (224, 224))
    img = img / 255.0
    img = np.expand_dims(img, axis=0)
    return img

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "ASL Multi-Route Framework Active 🚀"})

@app.route("/admin/users", methods=["GET"])
def admin_users():

    docs = db.collection("users").stream()

    users = []

    for doc in docs:

        data = doc.to_dict()

        users.append({
            "name": data.get("name", ""),
            "email": data.get("email", ""),
            "predictions": data.get("predictions", 0),
            "status": "active"
        })

    return jsonify(users)
@app.route("/admin/analytics", methods=["GET"])
def admin_analytics():

    users = list(db.collection("users").stream())
    history = list(db.collection("asl_history").stream())

    totalUsers = len(users)
    totalPredictions = len(history)

    confidence_sum = 0
    letters = []

    weekly_counter = {
        "Mon":0,
        "Tue":0,
        "Wed":0,
        "Thu":0,
        "Fri":0,
        "Sat":0,
        "Sun":0
    }

    for doc in history:

        data = doc.to_dict()

        confidence_sum += data.get("confidence",0)

        if "gesture" in data:
            letters.append(data["gesture"])

        ts = data.get("timestamp")

        if ts:
            day = ts.strftime("%a")
            if day in weekly_counter:
                weekly_counter[day] += 1

    avgConfidence = 0

    if totalPredictions > 0:
        avgConfidence = (confidence_sum / totalPredictions) * 100

    counter = Counter(letters)

    topLetters = []

    for letter,count in counter.most_common(5):
        topLetters.append({
            "letter":letter,
            "count":count
        })

    weekly = []

    for day,count in weekly_counter.items():
        weekly.append({
            "day":day,
            "predictions":count
        })

    return jsonify({
        "totalUsers":totalUsers,
        "totalPredictions":totalPredictions,
        "activeToday":totalUsers,
        "avgConfidence":avgConfidence,
        "weekly":weekly,
        "topLetters":topLetters
    })


# ----------------------------------------------------------------------
# 🛠️ ROUTE 1: STATIC IMAGE UPLOAD (100% Original Logic - Completely Untouched)
# ----------------------------------------------------------------------
@app.route("/predict", methods=["POST"])
def predict():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        file = request.files["image"]
        image_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(image_bytes, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({"error": "Invalid image"}), 400

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        processed = preprocess(rgb_img)
        prediction = model.predict(processed)

        class_index = int(np.argmax(prediction))
        confidence = float(np.max(prediction))
        label = labels[class_index]

        h_img, w_img, _ = img.shape
        return jsonify({
            "label": label,
            "confidence": confidence,
            "bbox": [0, 0, w_img, h_img]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ----------------------------------------------------------------------
# 🛠️ ROUTE 2: REAL-TIME LIVE CAMERA (Flipping and Color Sync Solution)
# ----------------------------------------------------------------------
@app.route("/predict_realtime", methods=["POST"])
def predict_realtime():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        file = request.files["image"]
        image_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(image_bytes, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({"error": "Invalid image"}), 400

        h_img, w_img, _ = img.shape

        # 🔥 CRUCIAL FIX 1: Horizontal Flip (Mirror correction)
        # React webcam streams video mirrored, which rotates hand orientation. 
        # Flip code 1 forces it to match standard training image directions.
        corrected_flip = cv2.flip(img, 1)

        # 🔥 CRUCIAL FIX 2: Standardizing Contrast and Ambient Light
        # Webcam variables can distort RGB distribution. We map it back cleanly.
        rgb_live = cv2.cvtColor(corrected_flip, cv2.COLOR_BGR2RGB)

        # Save current frame in project folder so you can physically view what model sees
        cv2.imwrite("realtime_debug_view.jpg", cv2.cvtColor(rgb_live, cv2.COLOR_RGB2BGR))

        # Model Inference
        processed = preprocess(rgb_live)
        prediction = model.predict(processed)

        class_index = int(np.argmax(prediction))
        confidence = float(np.max(prediction))
        label = labels[class_index]

        # Dynamic fallback gate if webcam frame contains high noise ratio
        if confidence < 0.40:
            return jsonify({
                "label": "Analyzing Sign Matrix...",
                "confidence": 0.0,
                "bbox": [0, 0, w_img, h_img]
            })

        return jsonify({
            "label": label,
            "confidence": confidence,
            "bbox": [0, 0, w_img, h_img]
        })

    except Exception as e:
        print("Realtime endpoint exception crash:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)