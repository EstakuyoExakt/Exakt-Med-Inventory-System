// Mock Data for Stock Movement Area Chart
export const stockMovementData = [
  { month: "Jan", stockIn: 420, stockOut: 280 },
  { month: "Feb", stockIn: 560, stockOut: 390 },
  { month: "Mar", stockIn: 610, stockOut: 450 },
  { month: "Apr", stockIn: 490, stockOut: 520 },
  { month: "May", stockIn: 750, stockOut: 460 },
  { month: "Jun", stockIn: 680, stockOut: 590 },
  { month: "Jul", stockIn: 830, stockOut: 510 },
  { month: "Aug", stockIn: 710, stockOut: 640 },
];

// Helper to generate Stock Bar Chart data based on inventory counts
export const getStockData = (totalMedicines = 0, lowStockCount = 0, outOfStockCount = 0) => [
  {
    name: "Total Medicines",
    count: totalMedicines,
    fill: "#3b82f6", // Blue 500
  },
  {
    name: "Low Stock",
    count: lowStockCount,
    fill: "#f59e0b", // Amber 500
  },
  {
    name: "Out of Stock",
    count: outOfStockCount,
    fill: "#ef4444", // Rose 500
  },
];
