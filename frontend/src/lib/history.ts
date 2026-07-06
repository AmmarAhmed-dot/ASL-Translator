import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const addHistory = async (item: {
  label: string;
  confidence: number;
}) => {
  await addDoc(collection(db, "history"), {
    ...item,
    time: serverTimestamp(),
  });
};