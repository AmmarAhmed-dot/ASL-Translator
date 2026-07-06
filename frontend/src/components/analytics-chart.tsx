import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale);

export function AnalyticsChart({ data }: { data: any[] }) {
  const counts: any = {};

  data.forEach((item) => {
    counts[item.label] = (counts[item.label] || 0) + 1;
  });

  return (
    <Bar
      data={{
        labels: Object.keys(counts),
        datasets: [
          {
            label: "Predictions",
            data: Object.values(counts),
          },
        ],
      }}
    />
  );
}