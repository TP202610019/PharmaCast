export interface PredictionRecord {
  id: string;
  date: string;
  forecastPeriod: number;
  totalProducts: number;
  criticalItems: number;
  accuracy: number;
  totalUnits: number;
  status: "completed" | "archived";
  products: PurchasePlanItem[];
  chartData: ChartDataPoint[];
  summaryCards: SummaryCard[];
}

export interface PurchasePlanItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  predictedDemand: number;
  recommendedQty: number;
  priority: "critical" | "high" | "medium" | "low";
  unitCost: number;
}

export interface ChartDataPoint {
  date: string;
  historical: number | null;
  predicted: number | null;
}

export interface SummaryCard {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

const generateChartData = (days: number): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const today = new Date(2026, 4, 5);

  for (let i = -30; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label = d.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
    const base = 320 + Math.sin(i * 0.3) * 80 + Math.random() * 40;
    if (i < 0) {
      data.push({ date: label, historical: Math.round(base), predicted: null });
    } else if (i === 0) {
      // Bridge point: both lines share this value so they connect visually
      const val = Math.round(base);
      data.push({ date: label, historical: val, predicted: val });
    } else {
      data.push({ date: label, historical: null, predicted: Math.round(base * 1.05) });
    }
  }
  return data;
};

export const mockHistory: PredictionRecord[] = [
  {
    id: "pred-001",
    date: "2026-05-01",
    forecastPeriod: 30,
    totalProducts: 48,
    criticalItems: 7,
    accuracy: 94.2,
    totalUnits: 3840,
    status: "completed",
    summaryCards: [
      { label: "Demanda Total Prevista", value: "3,840 uds", change: "+12.4%", positive: true },
      { label: "Productos Analizados", value: "48", change: "+3", positive: true },
      { label: "Precisión del Modelo", value: "94.2%", change: "+1.3%", positive: true },
      { label: "Horizonte de Predicción", value: "30 días", change: "", positive: true },
    ],
    chartData: generateChartData(30),
    products: [
      { id: "p1", name: "Amoxicilina 500mg", category: "Antibióticos", currentStock: 45, predictedDemand: 320, recommendedQty: 300, priority: "critical", unitCost: 8.5 },
      { id: "p2", name: "Ibuprofeno 400mg", category: "Analgésicos", currentStock: 120, predictedDemand: 480, recommendedQty: 380, priority: "high", unitCost: 3.2 },
      { id: "p3", name: "Omeprazol 20mg", category: "Gastro", currentStock: 200, predictedDemand: 290, recommendedQty: 120, priority: "medium", unitCost: 5.8 },
      { id: "p4", name: "Metformina 850mg", category: "Diabetes", currentStock: 30, predictedDemand: 210, recommendedQty: 200, priority: "critical", unitCost: 4.1 },
      { id: "p5", name: "Losartán 50mg", category: "Cardiovascular", currentStock: 85, predictedDemand: 175, recommendedQty: 110, priority: "high", unitCost: 6.7 },
      { id: "p6", name: "Paracetamol 1g", category: "Analgésicos", currentStock: 340, predictedDemand: 520, recommendedQty: 210, priority: "low", unitCost: 2.1 },
      { id: "p7", name: "Atorvastatina 20mg", category: "Cardiovascular", currentStock: 60, predictedDemand: 190, recommendedQty: 150, priority: "high", unitCost: 9.3 },
      { id: "p8", name: "Ciprofloxacino 500mg", category: "Antibióticos", currentStock: 15, predictedDemand: 140, recommendedQty: 140, priority: "critical", unitCost: 11.2 },
    ],
  },
  {
    id: "pred-002",
    date: "2026-04-15",
    forecastPeriod: 15,
    totalProducts: 42,
    criticalItems: 4,
    accuracy: 91.8,
    totalUnits: 2100,
    status: "completed",
    summaryCards: [
      { label: "Demanda Total Prevista", value: "2,100 uds", change: "+8.1%", positive: true },
      { label: "Productos Analizados", value: "42", change: "+2", positive: true },
      { label: "Precisión del Modelo", value: "91.8%", change: "+0.7%", positive: true },
      { label: "Horizonte de Predicción", value: "15 días", change: "", positive: true },
    ],
    chartData: generateChartData(15),
    products: [
      { id: "p1", name: "Amoxicilina 500mg", category: "Antibióticos", currentStock: 80, predictedDemand: 160, recommendedQty: 100, priority: "high", unitCost: 8.5 },
      { id: "p2", name: "Ibuprofeno 400mg", category: "Analgésicos", currentStock: 90, predictedDemand: 240, recommendedQty: 170, priority: "high", unitCost: 3.2 },
      { id: "p3", name: "Metformina 850mg", category: "Diabetes", currentStock: 10, predictedDemand: 105, recommendedQty: 110, priority: "critical", unitCost: 4.1 },
      { id: "p4", name: "Paracetamol 1g", category: "Analgésicos", currentStock: 200, predictedDemand: 260, recommendedQty: 80, priority: "low", unitCost: 2.1 },
    ],
  },
  {
    id: "pred-003",
    date: "2026-04-01",
    forecastPeriod: 7,
    totalProducts: 38,
    criticalItems: 3,
    accuracy: 96.1,
    totalUnits: 840,
    status: "completed",
    summaryCards: [
      { label: "Demanda Total Prevista", value: "840 uds", change: "+5.3%", positive: true },
      { label: "Productos Analizados", value: "38", change: "+1", positive: true },
      { label: "Precisión del Modelo", value: "96.1%", change: "+2.2%", positive: true },
      { label: "Horizonte de Predicción", value: "7 días", change: "", positive: true },
    ],
    chartData: generateChartData(7),
    products: [
      { id: "p1", name: "Ciprofloxacino 500mg", category: "Antibióticos", currentStock: 5, predictedDemand: 70, recommendedQty: 80, priority: "critical", unitCost: 11.2 },
      { id: "p2", name: "Omeprazol 20mg", category: "Gastro", currentStock: 30, predictedDemand: 145, recommendedQty: 130, priority: "medium", unitCost: 5.8 },
      { id: "p3", name: "Losartán 50mg", category: "Cardiovascular", currentStock: 20, predictedDemand: 88, recommendedQty: 80, priority: "critical", unitCost: 6.7 },
    ],
  },
  {
    id: "pred-004",
    date: "2026-03-15",
    forecastPeriod: 30,
    totalProducts: 51,
    criticalItems: 9,
    accuracy: 89.5,
    totalUnits: 4120,
    status: "archived",
    summaryCards: [
      { label: "Demanda Total Prevista", value: "4,120 uds", change: "+15.7%", positive: true },
      { label: "Productos Analizados", value: "51", change: "+5", positive: true },
      { label: "Precisión del Modelo", value: "89.5%", change: "-1.1%", positive: false },
      { label: "Horizonte de Predicción", value: "30 días", change: "", positive: true },
    ],
    chartData: generateChartData(30),
    products: [
      { id: "p1", name: "Amoxicilina 500mg", category: "Antibióticos", currentStock: 20, predictedDemand: 350, recommendedQty: 340, priority: "critical", unitCost: 8.5 },
      { id: "p2", name: "Metformina 850mg", category: "Diabetes", currentStock: 5, predictedDemand: 220, recommendedQty: 220, priority: "critical", unitCost: 4.1 },
    ],
  },
  {
    id: "pred-005",
    date: "2026-03-01",
    forecastPeriod: 15,
    totalProducts: 44,
    criticalItems: 5,
    accuracy: 92.7,
    totalUnits: 2350,
    status: "archived",
    summaryCards: [
      { label: "Demanda Total Prevista", value: "2,350 uds", change: "+9.4%", positive: true },
      { label: "Productos Analizados", value: "44", change: "+2", positive: true },
      { label: "Precisión del Modelo", value: "92.7%", change: "+1.5%", positive: true },
      { label: "Horizonte de Predicción", value: "15 días", change: "", positive: true },
    ],
    chartData: generateChartData(15),
    products: [],
  },
  {
    id: "pred-006",
    date: "2026-02-14",
    forecastPeriod: 7,
    totalProducts: 36,
    criticalItems: 2,
    accuracy: 97.3,
    totalUnits: 780,
    status: "archived",
    summaryCards: [
      { label: "Demanda Total Prevista", value: "780 uds", change: "+3.2%", positive: true },
      { label: "Productos Analizados", value: "36", change: "+2", positive: true },
      { label: "Precisión del Modelo", value: "97.3%", change: "+3.4%", positive: true },
      { label: "Horizonte de Predicción", value: "7 días", change: "", positive: true },
    ],
    chartData: generateChartData(7),
    products: [],
  },
];