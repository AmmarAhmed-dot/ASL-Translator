export type Prediction = {
  id: string;
  letter: string;
  confidence: number;
  source: "webcam" | "upload";
  timestamp: string;
};

export const mockHistory: Prediction[] = [
  { id: "1", letter: "A", confidence: 0.96, source: "webcam", timestamp: "2025-04-23T14:32:00Z" },
  { id: "2", letter: "L", confidence: 0.92, source: "upload", timestamp: "2025-04-23T14:30:00Z" },
  { id: "3", letter: "O", confidence: 0.88, source: "webcam", timestamp: "2025-04-23T14:28:00Z" },
  { id: "4", letter: "V", confidence: 0.94, source: "webcam", timestamp: "2025-04-23T14:25:00Z" },
  { id: "5", letter: "E", confidence: 0.97, source: "upload", timestamp: "2025-04-23T14:20:00Z" },
  { id: "6", letter: "H", confidence: 0.85, source: "webcam", timestamp: "2025-04-22T18:10:00Z" },
  { id: "7", letter: "3", confidence: 0.91, source: "webcam", timestamp: "2025-04-22T18:09:00Z" },
  { id: "8", letter: "B", confidence: 0.78, source: "upload", timestamp: "2025-04-21T09:45:00Z" },
  { id: "9", letter: "5", confidence: 0.93, source: "webcam", timestamp: "2025-04-21T09:40:00Z" },
  { id: "10", letter: "Y", confidence: 0.89, source: "upload", timestamp: "2025-04-20T15:12:00Z" },
];

export const mockUser = {
  username: "Alex Morgan",
  email: "alex@example.com",
  avatar: "AM",
  totalPredictions: 247,
  joinedAt: "March 2025",
  favoriteGestures: ["A", "L", "O", "V", "E"],
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  predictions: number;
  joined: string;
  status: "active" | "inactive";
};

export const mockAdminUsers: AdminUser[] = [
  { id: "u1", name: "Alex Morgan", email: "alex@example.com", predictions: 247, joined: "2025-03-12", status: "active" },
  { id: "u2", name: "Priya Patel", email: "priya@example.com", predictions: 512, joined: "2025-02-04", status: "active" },
  { id: "u3", name: "Marcus Lee", email: "marcus@example.com", predictions: 89, joined: "2025-04-01", status: "active" },
  { id: "u4", name: "Sofia Rossi", email: "sofia@example.com", predictions: 1342, joined: "2024-11-22", status: "active" },
  { id: "u5", name: "Jamal Brown", email: "jamal@example.com", predictions: 31, joined: "2025-04-18", status: "inactive" },
  { id: "u6", name: "Yuki Tanaka", email: "yuki@example.com", predictions: 678, joined: "2025-01-09", status: "active" },
  { id: "u7", name: "Emma Wilson", email: "emma@example.com", predictions: 204, joined: "2025-03-28", status: "active" },
];

export const adminAnalytics = {
  totalUsers: 1284,
  totalPredictions: 18432,
  activeToday: 312,
  avgConfidence: 0.91,
  weekly: [
    { day: "Mon", predictions: 1820, users: 142 },
    { day: "Tue", predictions: 2210, users: 168 },
    { day: "Wed", predictions: 1980, users: 155 },
    { day: "Thu", predictions: 2640, users: 198 },
    { day: "Fri", predictions: 3120, users: 245 },
    { day: "Sat", predictions: 2980, users: 232 },
    { day: "Sun", predictions: 3682, users: 312 },
  ],
  topLetters: [
    { letter: "A", count: 1420 },
    { letter: "E", count: 1280 },
    { letter: "I", count: 1140 },
    { letter: "O", count: 980 },
    { letter: "L", count: 920 },
    { letter: "S", count: 860 },
  ],
};

export const ASL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const ASL_DIGITS = "0123456789".split("");
export const ASL_ALL = [...ASL_LETTERS, ...ASL_DIGITS];

export function randomPrediction(): { letter: string; confidence: number } {
  const letter = ASL_ALL[Math.floor(Math.random() * ASL_ALL.length)];
  const confidence = 0.72 + Math.random() * 0.27;
  return { letter, confidence };
}

export function getConfidenceLevel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.65) return "medium";
  return "low";
}

export function getConfidenceColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  if (level === "high") return "text-success";
  if (level === "medium") return "text-warning";
  return "text-destructive";
}

export function getConfidenceBarClass(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  if (level === "high") return "confidence-bar-high";
  if (level === "medium") return "confidence-bar-medium";
  return "confidence-bar-low";
}

export function getFeedbackMessage(confidence: number): string {
  if (confidence >= 0.95) return "Excellent! Perfect gesture detected.";
  if (confidence >= 0.85) return "Great form! Clear detection.";
  if (confidence >= 0.75) return "Good — try holding your hand steadier.";
  if (confidence >= 0.65) return "Move your hand closer to the camera.";
  return "Low confidence — try better lighting and positioning.";
}
