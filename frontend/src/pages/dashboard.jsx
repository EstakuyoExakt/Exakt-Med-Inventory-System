import { useMemo } from "react";
import {
  Pill,
  Boxes,
  Layers,
  AlertTriangle,
  AlertOctagon,
  Clock,
  PackageX,
  TrendingUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// Components
import Card from "../components/card";

// Mock Data
import { medicines } from "../data/medicine";
import { batches } from "../data/batch";
import { stockMovementData, getStockData } from "../data/stock";

function Dashboard() {
  const currentDate = new Date("2026-08-19");

  // Summary Metrics
  const totalMedicines = medicines.length;
  const totalBatches = batches.length;
  const totalStockQuantity = batches.reduce(
    (sum, b) => sum + (b.quantity || 0),
    0,
  );

  // Map total quantity per medicine
  const medicineStockMap = useMemo(() => {
    const map = {};
    medicines.forEach((med) => {
      const medBatches = batches.filter(
        (b) =>
          b.medicine.toLowerCase().includes(med.genericName.toLowerCase()) ||
          b.medicine.toLowerCase().includes(med.brandName.toLowerCase()),
      );
      const totalQty = medBatches.reduce(
        (acc, curr) => acc + (curr.quantity || 0),
        0,
      );
      map[med.medCode] = totalQty;
    });
    return map;
  }, []);

  // Near Expired Batches (expiring within 90 days)
  const nearExpiredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const exp = new Date(batch.expiryDate);
      const diffTime = exp - currentDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 90;
    });
  }, [currentDate]);

  // Expired Batches (past expiry date)
  const expiredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const exp = new Date(batch.expiryDate);
      return exp < currentDate;
    });
  }, [currentDate]);

  // Data for Expiry Ring Chart
  const expiryData = useMemo(
    () => [
      {
        name: "Good",
        value: totalBatches - nearExpiredBatches.length - expiredBatches.length,
        color: "#10b981", // Emerald 500
      },
      {
        name: "Near Expired",
        value: nearExpiredBatches.length,
        color: "#f59e0b", // Amber 500
      },
      {
        name: "Expired",
        value: expiredBatches.length,
        color: "#ef4444", // Rose 500
      },
    ],
    [totalBatches, nearExpiredBatches.length, expiredBatches.length],
  );

  // Low Stock Medicines (quantity > 0 and <= 15)
  const lowStockMedicines = useMemo(() => {
    return medicines.filter((med) => {
      const qty = medicineStockMap[med.medCode] ?? 0;
      return qty > 0 && qty <= 15;
    });
  }, [medicineStockMap]);

  // Out of Stock Medicines (quantity === 0)
  const outOfStockMedicines = useMemo(() => {
    return medicines.filter((med) => {
      const qty = medicineStockMap[med.medCode] ?? 0;
      return qty === 0;
    });
  }, [medicineStockMap]);

  // Data for Stock Bar Chart
  const stockData = useMemo(
    () =>
      getStockData(
        totalMedicines,
        lowStockMedicines.length,
        outOfStockMedicines.length,
      ),
    [totalMedicines, lowStockMedicines.length, outOfStockMedicines.length],
  );

  return (
    <div className="grid gap-5 p-10 w-full max-w-7xl mx-auto overflow-y-auto max-h-full">
      {/* Top Row: Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-slide-up">
        <Card
          title="Total Medicines"
          action={
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Pill className="w-5 h-5" />
            </div>
          }
        >
          <span className="text-3xl font-bold text-slate-900">
            {totalMedicines}
          </span>
          <p className="text-xs text-slate-500 mt-1">Registered in catalogue</p>
        </Card>

        <Card
          title="Total Stock Quantity"
          action={
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Boxes className="w-5 h-5" />
            </div>
          }
        >
          <span className="text-3xl font-bold text-slate-900">
            {totalStockQuantity.toLocaleString()}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            Units across all batches
          </p>
        </Card>

        <Card
          title="Total Batches"
          action={
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
              <Layers className="w-5 h-5" />
            </div>
          }
        >
          <span className="text-3xl font-bold text-slate-900">
            {totalBatches}
          </span>
          <p className="text-xs text-slate-500 mt-1">Active batch lots</p>
        </Card>
      </div>

      {/* Tabe Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-slide-up-1">
        {/* Expiry Charts */}
        <Card
          title="Batch Expiry Overview"
          action={
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          }
        >
          <div className="h-56 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expiryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="value"
                >
                  {expiryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Stock Charts */}
        <Card
          title="Stock Overview"
          action={
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Boxes className="w-4 h-4" />
            </div>
          }
        >
          <div className="h-56 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stockData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Area Charts Stock In and Out */}
      <div className="animate-slide-up-2">
        <Card
          title="Stock Movement Overview"
          subTitle="Monthly comparison of Stock In vs Stock Out volume"
          action={
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          }
        >
          <div className="h-72 w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stockMovementData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorStockIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient
                    id="colorStockOut"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend verticalAlign="top" align="right" height={36} />
                <Area
                  type="monotone"
                  dataKey="stockIn"
                  name="Stock In"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorStockIn)"
                />
                <Area
                  type="monotone"
                  dataKey="stockOut"
                  name="Stock Out"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorStockOut)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
