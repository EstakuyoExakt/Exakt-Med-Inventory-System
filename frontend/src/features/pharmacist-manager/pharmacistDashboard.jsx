import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Boxes,
  Package,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Layers,
  CheckCircle2,
  ArrowRight,
  Pill,
  Sliders,
  ShieldCheck,
  Building2,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// Common Components
import Card from "../../components/common/card";

// Mock Data
import {
  dashboardMetrics,
  skuStockDistribution,
  skuHealthBarData,
  urgentAlerts,
} from "../../data/pharmacistDashboard";

// Custom Tooltip for Ring/Pie Chart
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-gray-900 text-white text-xs p-2.5 rounded-lg shadow-xl border border-gray-800">
        <p className="font-semibold text-gray-200">{data.name}</p>
        <p className="text-blue-300 font-bold mt-1">
          {Number(data.value).toLocaleString()}{" "}
          <span className="text-gray-400 font-normal">units</span>
        </p>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Bar Chart
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white text-xs p-3 rounded-xl shadow-xl border border-gray-800 space-y-1">
        <p className="font-bold text-gray-100 border-b border-gray-700 pb-1 mb-1">
          {label}
        </p>
        {payload.map((entry, index) => (
          <div
            key={`item-${index}`}
            className="flex items-center justify-between gap-3"
          >
            <span
              className="flex items-center gap-1.5"
              style={{ color: entry.color }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-bold text-gray-200">{entry.value} SKUs</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function PharmacistDashboard() {
  const [metrics] = useState(dashboardMetrics);

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Pharmacist Manager Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time stock health diagnostics, threshold warnings, batch
            expirations, and safety quarantine status
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/pharmacist/sku-management"
            className="btn-secondary text-xs shadow-sm flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-gray-600" />
            <span>Manage SKUs</span>
          </Link>
          <Link
            to="/pharmacist/batch-management"
            className="btn-primary text-xs shadow-sm flex items-center gap-1.5"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Manage Batches</span>
          </Link>
        </div>
      </div>

      {/* 8 Metric KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total SKUs */}
        <Card className="p-5 border border-gray-200/80 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total SKUs
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {metrics.totalSkus}
              </h3>
              <span className="inline-block text-[11px] font-medium text-blue-600 mt-1">
                Active catalog items
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* 2. Total Stock Quantity */}
        <Card className="p-5 border border-gray-200/80 shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Stock Quantity
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {metrics.totalStockQuantity.toLocaleString()}
              </h3>
              <span className="inline-block text-[11px] font-medium text-emerald-600 mt-1">
                Total physical units
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* 3. Total Low Stock */}
        <Card className="p-5 border border-gray-200/80 shadow-xs hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Low Stock
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {metrics.totalLowStock}
              </h3>
              <span className="inline-block text-[11px] font-medium text-amber-700 mt-1">
                &le; Safety minimum level
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* 4. Total Over Stock */}
        <Card className="p-5 border border-gray-200/80 shadow-xs hover:border-purple-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Over Stock
              </p>
              <h3 className="text-2xl font-bold text-purple-600 mt-1">
                {metrics.totalOverStock}
              </h3>
              <span className="inline-block text-[11px] font-medium text-purple-700 mt-1">
                Exceeding max capacity
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* 5. Total Expiry */}
        <Card className="p-5 border border-gray-200/80 shadow-xs hover:border-red-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Expiry
              </p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">
                {metrics.totalExpiry}
              </h3>
              <span className="inline-block text-[11px] font-medium text-red-700 mt-1">
                Batches past expiry date
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* 6. Total Near Expiry */}
        <Card className="p-5 border border-gray-200/80 shadow-xs hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Near Expiry
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {metrics.totalNearExpiry}
              </h3>
              <span className="inline-block text-[11px] font-medium text-amber-700 mt-1">
                Expiring within &le; 90 days
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* 7. Total Batches */}
        <Card className="p-5 border border-gray-200/80 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Batches
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {metrics.totalBatches}
              </h3>
              <span className="inline-block text-[11px] font-medium text-blue-600 mt-1">
                Tracked lot records
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* 8. Total Quarantined */}
        <Card className="p-5 border border-gray-200/80 shadow-xs hover:border-red-200 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Quarantined
              </p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">
                {metrics.totalQuarantined}
              </h3>
              <span className="inline-block text-[11px] font-medium text-red-700 mt-1">
                Dispensing lock enforced
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section: Pie/Ring Chart & Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ring / Donut Chart: SKUs Stock Distribution */}
        <Card className="lg:col-span-5 p-5 border border-gray-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Stock Breakdown by Category
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Proportion of physical inventory units across therapeutic
                  classes
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                {metrics.totalStockQuantity.toLocaleString()} Units
              </span>
            </div>

            {/* Ring Chart Container */}
            <div className="h-68 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <RechartsTooltip content={<CustomPieTooltip />} />
                  <Pie
                    data={skuStockDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {skuStockDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Legend Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-xs">
            {skuStockDistribution.slice(0, 6).map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-1.5 truncate"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-600 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Bar Chart: SKUs Low Stock, Over Stock & Out of Stock */}
        <Card className="lg:col-span-7 p-5 border border-gray-200/80 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Stock Health & Threshold Variance
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Comparative analysis of Low Stock, Over Stock, and Out of
                  Stock counts
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Low
                  Stock
                </span>
                <span className="flex items-center gap-1 text-purple-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" /> Over
                  Stock
                </span>
                <span className="flex items-center gap-1 text-red-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Out of
                  Stock
                </span>
              </div>
            </div>

            {/* Bar Chart Container */}
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={skuHealthBarData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E5E7EB"
                  />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                  />
                  <RechartsTooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="lowStock"
                    name="Low Stock"
                    fill="#F59E0B"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="overStock"
                    name="Over Stock"
                    fill="#8B5CF6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="outOfStock"
                    name="Out of Stock"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between text-xs text-gray-500 mt-2">
            <span>
              <span className="font-bold text-gray-700">3 categories</span>{" "}
              require threshold review or reorder requisition.
            </span>
            <Link
              to="/pharmacist/sku-management"
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 text-xs"
            >
              Adjust Thresholds <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Urgent Operational Alerts Section */}
      <Card className="p-5 border border-gray-200/80">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Immediate Attention Items
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              High priority batch expirations, quarantine flags, and threshold
              alerts
            </p>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            {urgentAlerts.length} Action Items
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
          {urgentAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                alert.severity === "critical"
                  ? "bg-red-50/40 border-red-200 text-red-900"
                  : "bg-amber-50/40 border-amber-200 text-amber-900"
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {alert.severity === "critical" ? (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <h4 className="font-bold text-xs">{alert.title}</h4>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {alert.description}
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200/60 text-[11px] text-gray-400">
                <span>{alert.time}</span>
                <Link
                  to="/pharmacist/batch-management"
                  className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  Review Batch <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default PharmacistDashboard;
