import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

// SAVE PREDICTION
export const savePrediction = async (
  userId: string,
  label: string,
  confidence: number
) => {
  try {
    await addDoc(collection(db, "predictions"), {
      userId,
      label,
      confidence,
      time: new Date(),
    });

    console.log("Prediction saved");
  } catch (err) {
    console.error("Error saving prediction:", err);
  }
};