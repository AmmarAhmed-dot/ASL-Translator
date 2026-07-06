# ASL Translator

A real-time American Sign Language (ASL) translator application. This project uses machine learning to recognize sign language gestures and translates them into text, bridging the communication gap.

## Project Structure

The repository is divided into two main parts:

- **`frontend/`**: The user interface built with React (Vite). It handles capturing user input, displaying the camera feed, and presenting the translated text in real-time.
- **`backend/`**: The Python backend (Flask & TensorFlow) that processes the video feed, runs the machine learning model for gesture recognition, and returns the predicted sign.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite, Firebase
- **Backend**: Python, Flask, TensorFlow / Keras, OpenCV

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (3.9+)

### Running the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   python app.py
   ```

### Running the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## License

This project is licensed under the MIT License.
