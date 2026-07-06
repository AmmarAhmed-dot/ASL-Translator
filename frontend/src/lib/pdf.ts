import jsPDF from "jspdf";
import { getDocs, collection } from "firebase/firestore";
import { db } from "./firebase";

export const downloadPDF = async () => {
  const doc = new jsPDF();

  const snap = await getDocs(collection(db, "history"));
  const data = snap.docs.map((d) => d.data());

  doc.setFontSize(18);
  doc.text("ASL Prediction History", 10, 15);

  doc.setFontSize(12);

  let y = 30;

  if (data.length === 0) {
    doc.text("No history found", 10, y);
    doc.save("history.pdf");
    return;
  }

  data.forEach((item: any, i: number) => {
    const label = item.label || "-";
    const confidence = item.confidence
      ? (item.confidence * 100).toFixed(1)
      : "0";

    doc.text(
      `${i + 1}. ${label} - ${confidence}%`,
      10,
      y
    );

    y += 10;

    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save("history.pdf");
};