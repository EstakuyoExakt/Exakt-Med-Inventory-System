import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  AlertTriangle,
  AlertCircle,
  Package,
  Boxes,
  Truck,
  Plus,
  Clock,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  FileText,
  Building2,
  Send,
  Pill,
} from "lucide-react";

// Common Components
import Card from "../../components/common/card";

// Mock Data Imports
import {
  procurementMetrics,
  priorityRestockSkus,
  recentOrderRequests,
} from "../../data/procurementDashboard";

function ProcurementDashboard() {
  const [metrics] = useState(procurementMetrics);

  const getOrderStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Pending Approval":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Procurement Officer Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time replenishment monitoring, inventory threshold warnings,
            and purchase order requisition management
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/procurement/batch-management"
            className="btn-secondary text-xs shadow-sm flex items-center gap-1.5"
          >
            <Package className="w-3.5 h-3.5 text-gray-600" />
            <span>Batch Management</span>
          </Link>
          <Link
            to="/procurement/order-request"
            className="btn-primary text-xs shadow-sm flex items-center gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Order Requests</span>
          </Link>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Total Reorder SKUs */}
        <Card className="p-5 border border-amber-200/80 shadow-xs hover:border-amber-300 transition-all bg-linear-to-br from-white to-amber-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Total Reorder SKUs
              </p>
              <h3 className="text-3xl font-extrabold text-amber-600 mt-1.5">
                {metrics.totalReorder}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 mt-1 bg-amber-100/70 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> &le; Reorder trigger point
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 border border-amber-200 shadow-xs">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 2. Total Minimum SKUs */}
        <Card className="p-5 border border-red-200/80 shadow-xs hover:border-red-300 transition-all bg-linear-to-br from-white to-red-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                Total Minimum SKUs
              </p>
              <h3 className="text-3xl font-extrabold text-red-600 mt-1.5">
                {metrics.totalMinimumSkus}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 mt-1 bg-red-100/70 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" /> Critical shortage (&le; Min safety level)
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 border border-red-200 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 3. Total Batches */}
        <Card className="p-5 border border-blue-200/80 shadow-xs hover:border-blue-300 transition-all bg-linear-to-br from-white to-blue-50/20 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Total Batches
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1.5">
                {metrics.totalBatches}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 mt-1 bg-blue-100/70 px-2 py-0.5 rounded-full">
                <Boxes className="w-3 h-3" /> Tracked inventory lots across facilities
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 border border-blue-200 shadow-xs">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Grid: Priority Restock Items & Recent Purchase Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Urgent Items Needing Reorder */}
        <Card className="lg:col-span-7 p-0 overflow-hidden border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Priority Restock Requirements
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  SKUs with critical stock shortages requiring immediate purchase orders
                </p>
              </div>
              <Link
                to="/procurement/order-request"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-gray-100">
              {priorityRestockSkus.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-gray-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg font-semibold text-xs border shrink-0 mt-0.5 ${
                        item.urgency === "CRITICAL"
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-amber-50 text-amber-600 border-amber-200"
                      }`}
                    >
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">
                          {item.brandName}
                        </span>
                        <span className="font-mono text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-medium">
                          {item.sku}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.genericName} • {item.dosage}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Supplier: {item.suggestedSupplier}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-900">
                        {item.currentStock}{" "}
                        <span className="text-gray-400 font-normal">
                          / Reorder: {item.reorderLevel}
                        </span>
                      </div>
                      <span
                        className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border mt-0.5 ${
                          item.urgency === "CRITICAL"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {item.urgency === "CRITICAL"
                          ? "Below Min Threshold"
                          : "Reorder Triggered"}
                      </span>
                    </div>

                    <Link
                      to="/procurement/order-request"
                      className="btn-primary text-xs py-1.5 px-2.5 shadow-xs"
                    >
                      Order
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {priorityRestockSkus.length} critical items needing purchase action.
            </span>
            <Link
              to="/procurement/order-request"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Open Purchase Request Form &rarr;
            </Link>
          </div>
        </Card>

        {/* Recent Purchase Orders & Shipments */}
        <Card className="lg:col-span-5 p-0 overflow-hidden border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Recent Requisitions
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Latest purchase order dispatches and transit statuses
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                {metrics.totalPendingOrders} Active
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {recentOrderRequests.map((order) => (
                <div
                  key={order.orderId}
                  className="p-4 hover:bg-gray-50/60 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700 text-xs">
                      {order.orderId}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getOrderStatusBadge(
                        order.status,
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-900">
                      {order.brandName}
                    </span>
                    <span className="font-bold text-gray-800">
                      {order.quantity.toLocaleString()} units
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>{order.supplier}</span>
                    <span>{order.requestDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Need to record incoming batches?</span>
            <Link
              to="/procurement/batch-management"
              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
            >
              Receive Batches <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ProcurementDashboard;
