export const predictImage = async (blob: Blob) => {
  const formData = new FormData();

  console.log("📤 Sending image to backend...");

  formData.append("image", blob);

  const res = await fetch("http://127.0.0.1:5000/predict", {
    method: "POST",
    body: formData,
  });

  console.log("📡 Response status:", res.status);

  let data;
  try {
    data = await res.json();
  } catch (err) {
    console.error("❌ JSON parse failed");
    throw new Error("Invalid backend response");
  }

  console.log("📥 Backend response:", data);

  if (!res.ok) {
    throw new Error(data?.error || "Prediction failed");
  }

  return {
    label: data.label ?? data.prediction ?? null,
    confidence: data.confidence ?? 0,
  };
};