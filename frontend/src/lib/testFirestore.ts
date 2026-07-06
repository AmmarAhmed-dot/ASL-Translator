import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export const testDB = async () => {
  await setDoc(doc(db, "test", "123"), {
    message: "Firestore is working!",
    time: new Date(),
  });

  console.log("Data saved to Firestore");
};