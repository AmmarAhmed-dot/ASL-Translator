"""
ASL Sign Language Model Retraining Script
==========================================
This script retrains the MobileNetV2-based ASL model using the 
ASL Alphabet dataset from Kaggle (87,000+ images, 29 classes).

Usage:
  1. Install dependencies:  pip install kagglehub tensorflow opencv-python matplotlib
  2. Set up Kaggle credentials (see instructions below)
  3. Run:  python retrain_model.py

Kaggle Setup:
  - Go to https://www.kaggle.com/settings → API → Create New Token
  - This downloads a kaggle.json file
  - Place it at: ~/.kaggle/kaggle.json (Mac/Linux) or C:\\Users\\<user>\\.kaggle\\kaggle.json (Windows)
  - chmod 600 ~/.kaggle/kaggle.json
"""

import os
import sys
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense, Dropout
from tensorflow.keras.models import Sequential
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
import matplotlib
matplotlib.use('Agg')  # non-interactive backend for servers
import matplotlib.pyplot as plt

# ─── Configuration ───────────────────────────────────────────────────────────
IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 20            # EarlyStopping will cut this short if plateauing
LEARNING_RATE = 0.001
MODEL_SAVE_PATH = os.path.join("model", "model.keras")
MODEL_BACKUP_PATH = os.path.join("model", "model_backup.keras")

# The 37 labels used in app.py — we must match this exactly
REQUIRED_LABELS = [
    "0","1","2","3","4","5","6","7","8","9",
    "A","B","C","D","E","F","G","H","I","J",
    "K","L","M","N","O","P","Q","R","S","T",
    "U","V","W","X","Y","Z","space"
]

def download_dataset():
    """Download the ASL Alphabet dataset from Kaggle using kagglehub."""
    try:
        import kagglehub
    except ImportError:
        print("❌ kagglehub not installed. Installing now...")
        os.system(f"{sys.executable} -m pip install kagglehub")
        import kagglehub
    
    print("📥 Downloading ASL Alphabet dataset from Kaggle...")
    print("   (This is ~1GB, may take a few minutes on first run)")
    print("   Dataset: https://www.kaggle.com/datasets/grassknoted/asl-alphabet\n")
    
    path = kagglehub.dataset_download("grassknoted/asl-alphabet")
    print(f"✅ Dataset downloaded to: {path}\n")
    return path

def find_train_dir(dataset_path):
    """Locate the actual training images directory."""
    # The dataset structure is: asl-alphabet/asl_alphabet_train/asl_alphabet_train/<classes>
    candidates = [
        os.path.join(dataset_path, "asl_alphabet_train", "asl_alphabet_train"),
        os.path.join(dataset_path, "asl_alphabet_train"),
        dataset_path,
    ]
    
    for candidate in candidates:
        if os.path.isdir(candidate):
            subdirs = [d for d in os.listdir(candidate) 
                       if os.path.isdir(os.path.join(candidate, d))]
            # Check if it has letter directories
            if any(d in ['A', 'B', 'C'] for d in subdirs):
                print(f"📂 Training data found at: {candidate}")
                print(f"   Classes found: {sorted(subdirs)}")
                print(f"   Total classes: {len(subdirs)}\n")
                return candidate
    
    print(f"❌ Could not find training directory. Dataset contents:")
    for root, dirs, files in os.walk(dataset_path):
        level = root.replace(dataset_path, '').count(os.sep)
        if level < 3:
            indent = ' ' * 2 * level
            print(f'{indent}{os.path.basename(root)}/')
    sys.exit(1)

def create_data_generators(train_dir):
    """Create training and validation data generators with augmentation."""
    
    # Map the Kaggle dataset class names to our label system
    # Kaggle has: A-Z, del, nothing, space
    # We need: 0-9, A-Z, space
    # We'll train on what's available (A-Z + space) and note that 0-9 need separate data
    
    print("🔧 Setting up data generators with augmentation...\n")
    
    # Heavy augmentation to make the model robust to real-world webcam conditions
    train_datagen = ImageDataGenerator(
        rescale=1.0/255.0,
        rotation_range=15,
        width_shift_range=0.15,
        height_shift_range=0.15,
        shear_range=0.1,
        zoom_range=0.15,
        horizontal_flip=False,  # NEVER flip ASL signs — mirroring changes meaning!
        brightness_range=[0.7, 1.3],
        fill_mode='nearest',
        validation_split=0.15   # 15% for validation
    )
    
    val_datagen = ImageDataGenerator(
        rescale=1.0/255.0,
        validation_split=0.15
    )
    
    train_generator = train_datagen.flow_from_directory(
        train_dir,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training',
        shuffle=True,
        interpolation='bilinear'
    )
    
    val_generator = val_datagen.flow_from_directory(
        train_dir,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation',
        shuffle=False,
        interpolation='bilinear'
    )
    
    # Print class mapping
    class_indices = train_generator.class_indices
    print(f"\n📋 Class mapping from dataset:")
    for cls, idx in sorted(class_indices.items(), key=lambda x: x[1]):
        print(f"   [{idx:2d}] → {cls}")
    
    return train_generator, val_generator, class_indices

def build_model(num_classes):
    """Build MobileNetV2 transfer learning model — same architecture as original."""
    print(f"\n🏗️  Building MobileNetV2 model for {num_classes} classes...")
    
    base_model = MobileNetV2(
        weights='imagenet',
        include_top=False,
        input_shape=(IMG_SIZE, IMG_SIZE, 3)
    )
    
    # Freeze the base model initially
    base_model.trainable = False
    
    model = Sequential([
        base_model,
        GlobalAveragePooling2D(),
        Dropout(0.3),
        Dense(128, activation='relu'),
        Dropout(0.2),
        Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    model.summary()
    return model, base_model

def fine_tune_model(model, base_model):
    """Unfreeze top layers of MobileNetV2 for fine-tuning."""
    print("\n🔓 Unfreezing top 30 layers of MobileNetV2 for fine-tuning...")
    
    base_model.trainable = True
    # Freeze all layers except the last 30
    for layer in base_model.layers[:-30]:
        layer.trainable = False
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE / 10),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    trainable_count = sum(1 for l in model.layers if l.trainable)
    print(f"   Trainable layers: {trainable_count}")
    return model

def train(model, train_gen, val_gen, phase_name, epochs):
    """Run training with callbacks."""
    print(f"\n{'='*60}")
    print(f"🚀 TRAINING PHASE: {phase_name}")
    print(f"{'='*60}\n")
    
    callbacks = [
        ModelCheckpoint(
            MODEL_SAVE_PATH,
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        ),
        EarlyStopping(
            monitor='val_accuracy',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1
        )
    ]
    
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=epochs,
        callbacks=callbacks,
        verbose=1
    )
    
    return history

def plot_training_history(histories, save_path='training_history.png'):
    """Save training curves as an image."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    
    epoch_offset = 0
    for name, history in histories:
        epochs_range = range(epoch_offset, epoch_offset + len(history.history['accuracy']))
        ax1.plot(epochs_range, history.history['accuracy'], label=f'{name} - Train')
        ax1.plot(epochs_range, history.history['val_accuracy'], label=f'{name} - Val', linestyle='--')
        ax2.plot(epochs_range, history.history['loss'], label=f'{name} - Train')
        ax2.plot(epochs_range, history.history['val_loss'], label=f'{name} - Val', linestyle='--')
        epoch_offset += len(history.history['accuracy'])
    
    ax1.set_title('Model Accuracy')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Accuracy')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    ax2.set_title('Model Loss')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Loss')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    print(f"\n📊 Training curves saved to: {save_path}")

def update_labels_in_app(class_indices):
    """Generate the correct labels array for app.py based on training class order."""
    # The class_indices maps class_name → index
    # We need the reverse: index → class_name
    index_to_label = {v: k for k, v in class_indices.items()}
    
    labels = []
    for i in range(len(index_to_label)):
        label = index_to_label[i]
        # Normalize: 'del' and 'nothing' from Kaggle dataset are extra classes
        # Map them or keep them as-is
        labels.append(label)
    
    print(f"\n⚠️  IMPORTANT: Update the 'labels' array in app.py to match this order:")
    print(f"labels = {labels}")
    
    # Save to a file for easy copy-paste
    with open("new_labels.py", "w") as f:
        f.write(f"# Generated by retrain_model.py\n")
        f.write(f"# Copy this into app.py to replace the existing 'labels' array\n\n")
        f.write(f"labels = {labels}\n")
    
    print(f"   (Also saved to new_labels.py for easy copy-paste)\n")
    return labels

def main():
    print("="*60)
    print("🤖 ASL Sign Language Model Retraining")
    print("="*60)
    print()
    
    # Step 1: Backup old model
    if os.path.exists(MODEL_SAVE_PATH):
        import shutil
        shutil.copy2(MODEL_SAVE_PATH, MODEL_BACKUP_PATH)
        print(f"💾 Backed up old model to: {MODEL_BACKUP_PATH}\n")
    
    # Step 2: Download dataset
    dataset_path = download_dataset()
    train_dir = find_train_dir(dataset_path)
    
    # Step 3: Create data generators
    train_gen, val_gen, class_indices = create_data_generators(train_dir)
    num_classes = len(class_indices)
    
    # Step 4: Build model
    model, base_model = build_model(num_classes)
    
    # Step 5: Phase 1 — Train only the top layers (frozen base)
    history1 = train(model, train_gen, val_gen, "Feature Extraction (frozen base)", epochs=10)
    
    # Step 6: Phase 2 — Fine-tune top layers of MobileNetV2
    model = fine_tune_model(model, base_model)
    history2 = train(model, train_gen, val_gen, "Fine-Tuning (unfrozen top layers)", epochs=EPOCHS)
    
    # Step 7: Plot training history
    plot_training_history([("Phase 1", history1), ("Phase 2", history2)])
    
    # Step 8: Generate correct labels
    new_labels = update_labels_in_app(class_indices)
    
    # Step 9: Final evaluation
    print("\n" + "="*60)
    print("📊 FINAL EVALUATION")
    print("="*60)
    val_loss, val_acc = model.evaluate(val_gen, verbose=0)
    print(f"   Validation Loss:     {val_loss:.4f}")
    print(f"   Validation Accuracy: {val_acc*100:.1f}%")
    
    print(f"\n✅ Model saved to: {MODEL_SAVE_PATH}")
    print(f"   Old model backed up to: {MODEL_BACKUP_PATH}")
    print(f"\n⚠️  NEXT STEP: Update 'labels' array in app.py (see new_labels.py)")
    print(f"   Then restart the Flask backend: python3 app.py\n")

if __name__ == "__main__":
    main()
