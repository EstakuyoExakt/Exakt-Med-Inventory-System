export const dashboardMetrics = {
  totalSkus: 14,
  totalStockQuantity: 5130,
  totalLowStock: 3,
  totalOverStock: 2,
  totalExpiry: 1,
  totalNearExpiry: 3,
  totalBatches: 18,
  totalQuarantined: 2,
};

// Data for Ring / Donut / Pie Chart (Stock Quantity by SKU Category / Top SKUs)
export const skuStockDistribution = [
  { name: "Analgesics & Antipyretics", value: 1980, color: "#3B82F6" }, // Blue
  { name: "Antibiotics", value: 495, color: "#10B981" }, // Emerald
  { name: "Cardiovascular", value: 640, color: "#8B5CF6" }, // Purple
  { name: "Antihistamines", value: 620, color: "#F59E0B" }, // Amber
  { name: "Gastrointestinal", value: 510, color: "#06B6D4" }, // Cyan
  { name: "Vitamins & Supplements", value: 215, color: "#EC4899" }, // Pink
  { name: "Respiratory", value: 140, color: "#6366F1" }, // Indigo
  { name: "Antidiabetic", value: 150, color: "#14B8A6" }, // Teal
  { name: "Anti-inflammatory", value: 380, color: "#F97316" }, // Orange
];

// Data for Bar Chart: Stock Health Breakdown across Categories (Low Stock, Over Stock, Out of Stock, Optimal)
export const skuHealthBarData = [
  {
    category: "Antibiotics",
    lowStock: 1,
    overStock: 0,
    outOfStock: 0,
    optimal: 3,
  },
  {
    category: "Analgesics",
    lowStock: 0,
    overStock: 1,
    outOfStock: 0,
    optimal: 4,
  },
  {
    category: "Cardio",
    lowStock: 1,
    overStock: 0,
    outOfStock: 0,
    optimal: 2,
  },
  {
    category: "Antidiabetic",
    lowStock: 1,
    overStock: 0,
    outOfStock: 0,
    optimal: 2,
  },
  {
    category: "Antihistamine",
    lowStock: 0,
    overStock: 0,
    outOfStock: 0,
    optimal: 3,
  },
  {
    category: "Gastro",
    lowStock: 0,
    overStock: 0,
    outOfStock: 0,
    optimal: 2,
  },
  {
    category: "Respiratory",
    lowStock: 0,
    overStock: 0,
    outOfStock: 0,
    optimal: 2,
  },
  {
    category: "Anti-inflam",
    lowStock: 0,
    overStock: 1,
    outOfStock: 1,
    optimal: 1,
  },
];

// Critical Alerts & Action Items for the Pharmacist Manager
export const urgentAlerts = [
  {
    id: 1,
    type: "EXPIRY",
    title: "Batch BAT-2024-0899 Expired",
    description: "Paracetamol 500mg (PARA500-TAB-100) has expired. Immediate disposal/audit needed.",
    severity: "critical",
    time: "2 hours ago",
  },
  {
    id: 2,
    type: "QUARANTINE",
    title: "2 Batches in Quarantine Lock",
    description: "Insulin 100IU and Amoxicillin batches pending QA cold-chain audit clearance.",
    severity: "warning",
    time: "4 hours ago",
  },
  {
    id: 3,
    type: "LOW_STOCK",
    title: "3 SKUs Below Minimum Threshold",
    description: "Metformin 850mg and Amlodipine 5mg have reached critical safety stock levels.",
    severity: "warning",
    time: "Today, 08:30 AM",
  },
];
