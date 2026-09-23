import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  SlidersHorizontal,
  Calendar,
  User,
  Package,
  Building2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  RotateCcw,
  FileText,
  Boxes,
} from "lucide-react";

import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";
import skuService from "../../services/sku";
import useAuth from "../../hooks/useAuth";
import { facilities } from "../../data/facility";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateStr);
  }
};

const normalizeAdjustmentType = (type) => {
  if (!type) return "ADJUSTMENT";
  const upper = String(type).toUpperCase();
  if (upper === "ADD" || upper === "ADDITION") return "ADD";
  if (upper === "SUBTRACT" || upper === "DEDUCTION") return "SUBTRACT";
  if (upper === "SET" || upper === "RECONCILIATION") return "SET";
  return upper;
};

const getAdjustmentBadge = (type) => {
  const norm = normalizeAdjustmentType(type);
  switch (norm) {
    case "ADD":
      return {
        label: "Addition",
        icon: ArrowUpRight,
        classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "SUBTRACT":
      return {
        label: "Deduction",
        icon: ArrowDownRight,
        classes: "bg-rose-50 text-rose-700 border-rose-200",
      };
    case "SET":
      return {
        label: "Reconciliation",
        icon: RotateCcw,
        classes: "bg-blue-50 text-blue-700 border-blue-200",
      };
    default:
      return {
        label: type || "Adjustment",
        icon: ClipboardList,
        classes: "bg-gray-50 text-gray-700 border-gray-200",
      };
  }
};

function StockAdjustmentLogs({
  facilityId: propFacilityId,
  facilityName: propFacilityName,
  onBack,
  initialSkuId = null,
}) {
  const { facility } = useAuth();

  const currentFacilityName = useMemo(() => {
    return (
      propFacilityName ||
      facility?.name ||
      facilities[0]?.name ||
      "Exakt Central General Hospital"
    );
  }, [propFacilityName, facility]);

  const targetFacilityId = useMemo(() => {
    return (
      propFacilityId ||
      facility?.id ||
      facilities.find((f) => f.name === currentFacilityName)?.id
    );
  }, [propFacilityId, facility?.id, currentFacilityName]);

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedReason, setSelectedReason] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Log for Details Modal
  const [selectedLog, setSelectedLog] = useState(null);

  // Fetch adjustment logs from backend API
  const fetchLogs = useCallback(async () => {
    if (!targetFacilityId) {
      setLogs([]);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const data =
        await skuService.getAdjustmentLogsByFacility(targetFacilityId);
      if (Array.isArray(data)) {
        setLogs(data);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error("Failed to fetch stock adjustment logs:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load stock adjustment logs from server.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [targetFacilityId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Extract distinct reasons for filter dropdown
  const distinctReasons = useMemo(() => {
    const reasons = new Set();
    logs.forEach((log) => {
      if (log.reason) reasons.add(log.reason);
    });
    return Array.from(reasons);
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filter by initialSkuId if passed
      if (initialSkuId && log.skuId !== initialSkuId) {
        return false;
      }

      // Filter by Type
      if (selectedType !== "ALL") {
        const normSelected = normalizeAdjustmentType(selectedType);
        const normLog = normalizeAdjustmentType(log.adjustmentType);
        if (normSelected !== normLog) {
          return false;
        }
      }

      // Filter by Reason
      if (selectedReason !== "ALL" && log.reason !== selectedReason) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSku = log.skuName?.toLowerCase().includes(q);
        const matchesBrand = log.brandName?.toLowerCase().includes(q);
        const matchesReason = log.reason?.toLowerCase().includes(q);
        const matchesUser = log.userName?.toLowerCase().includes(q);
        const matchesNotes = log.notes?.toLowerCase().includes(q);
        const matchesSkuId = String(log.skuId || "").includes(q);
        return (
          matchesSku ||
          matchesBrand ||
          matchesReason ||
          matchesUser ||
          matchesNotes ||
          matchesSkuId
        );
      }

      return true;
    });
  }, [logs, initialSkuId, selectedType, selectedReason, searchQuery]);

  // KPI Metrics Calculations
  const metrics = useMemo(() => {
    let additionsUnits = 0;
    let deductionsUnits = 0;
    let netDelta = 0;
    let additionsCount = 0;
    let deductionsCount = 0;
    let reconciliationCount = 0;

    filteredLogs.forEach((log) => {
      const delta = Number(log.deltaUnits) || 0;
      netDelta += delta;
      const normType = normalizeAdjustmentType(log.adjustmentType);

      if (normType === "ADD") {
        additionsUnits += Math.abs(delta);
        additionsCount += 1;
      } else if (normType === "SUBTRACT") {
        deductionsUnits += Math.abs(delta);
        deductionsCount += 1;
      } else if (normType === "SET") {
        reconciliationCount += 1;
        if (delta < 0) {
          deductionsUnits += Math.abs(delta);
        } else if (delta > 0) {
          additionsUnits += delta;
        }
      } else {
        if (delta < 0) {
          deductionsUnits += Math.abs(delta);
          deductionsCount += 1;
        } else if (delta > 0) {
          additionsUnits += delta;
          additionsCount += 1;
        }
      }
    });

    return {
      totalLogs: filteredLogs.length,
      netDelta,
      additionsUnits,
      additionsCount,
      deductionsUnits,
      deductionsCount,
      reconciliationCount,
    };
  }, [filteredLogs]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                title="Back to SKU Inventory"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Stock Adjustment Audit Logs
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
              <Building2 className="w-3.5 h-3.5" />
              <span>{currentFacilityName}</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Immutable historical audit ledger tracking all manual inventory
            additions, spoilage deductions, and reconciliation counts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isLoading}
            className="btn-secondary shadow-sm flex items-center gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50"
            title="Refresh logs from server"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-500 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="btn-primary shadow-sm flex items-center gap-1.5"
            >
              <Boxes className="w-4 h-4" />
              <span>Back to SKU Catalog</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Logs */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Adjustments
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {metrics.totalLogs}
              </h3>
              <span className="inline-block text-[11px] font-medium text-gray-500 mt-1">
                Recorded events
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Net Stock Movement */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Net Stock Impact
              </p>
              <h3
                className={`text-2xl font-bold mt-1 ${
                  metrics.netDelta > 0
                    ? "text-emerald-600"
                    : metrics.netDelta < 0
                      ? "text-rose-600"
                      : "text-gray-900"
                }`}
              >
                {metrics.netDelta > 0
                  ? `+${metrics.netDelta}`
                  : metrics.netDelta}{" "}
                <span className="text-xs font-normal text-gray-500">units</span>
              </h3>
              <span className="inline-block text-[11px] font-medium text-gray-500 mt-1">
                Across filtered logs
              </span>
            </div>
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                metrics.netDelta >= 0
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-rose-50 text-rose-600 border-rose-100"
              }`}
            >
              {metrics.netDelta >= 0 ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <ArrowDownRight className="w-5 h-5" />
              )}
            </div>
          </div>
        </Card>

        {/* Additions */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Additions
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                +{metrics.additionsUnits}{" "}
                <span className="text-xs font-normal text-gray-500">units</span>
              </h3>
              <span className="inline-block text-[11px] font-medium text-emerald-600 mt-1">
                {metrics.additionsCount} addition logs
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Deductions */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Deductions
              </p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">
                -{metrics.deductionsUnits}{" "}
                <span className="text-xs font-normal text-gray-500">units</span>
              </h3>
              <span className="inline-block text-[11px] font-medium text-rose-600 mt-1">
                {metrics.deductionsCount} deduction logs
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="p-0 overflow-hidden border border-gray-200">
        {/* Filters Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-gray-50/50">
          <div className="w-full md:w-80">
            <SearchBar
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              onClear={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              placeholder="Search by SKU, brand, user, reason..."
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
            {/* Adjustment Type Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-xs w-full sm:w-auto">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-medium text-gray-700 outline-none w-full cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="ADD">Addition (+)</option>
                <option value="SUBTRACT">Deduction (-)</option>
                <option value="SET">Reconciliation (~)</option>
              </select>
            </div>

            {/* Reason Filter */}
            {distinctReasons.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-xs w-full sm:w-auto">
                <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <select
                  value={selectedReason}
                  onChange={(e) => {
                    setSelectedReason(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-medium text-gray-700 outline-none w-full cursor-pointer max-w-44 truncate"
                >
                  <option value="ALL">All Reasons</option>
                  {distinctReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchLogs}
              className="text-xs font-semibold underline hover:text-red-900"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Logs Table */}
        <div className="overflow-x-auto min-h-75">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">SKU / Medicine</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Previous</th>
                <th className="py-3 px-4 text-center">Change</th>
                <th className="py-3 px-4 text-right">New Stock</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Adjusted By</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <p className="text-sm font-medium text-gray-500">
                        Loading stock adjustment logs...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <ClipboardList className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-700">
                        No adjustment logs found
                      </h4>
                      <p className="text-xs text-gray-500">
                        {searchQuery ||
                        selectedType !== "ALL" ||
                        selectedReason !== "ALL"
                          ? "Try clearing your filters or search terms."
                          : "No stock adjustments have been recorded yet for this facility."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const badge = getAdjustmentBadge(log.adjustmentType);
                  const BadgeIcon = badge.icon;
                  const delta = Number(log.deltaUnits) || 0;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-blue-50/20 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{formatDate(log.createdAt)}</span>
                        </div>
                      </td>

                      {/* SKU / Medicine */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-xs">
                          <p className="font-bold text-gray-900 truncate">
                            {log.skuName || "Unknown SKU"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {log.brandName && (
                              <span className="text-[11px] text-gray-500 truncate">
                                {log.brandName}
                              </span>
                            )}
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-gray-100 text-gray-600">
                              #{log.skuId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.classes}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Previous */}
                      <td className="py-3.5 px-4 text-right font-medium text-gray-600 whitespace-nowrap">
                        {log.previousUnits?.toLocaleString() ?? 0}
                      </td>

                      {/* Change */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs ${
                            delta > 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : delta < 0
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-gray-100 text-gray-700 border border-gray-200"
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      </td>

                      {/* New Stock */}
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900 whitespace-nowrap">
                        {log.newUnits?.toLocaleString() ?? 0}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 max-w-40 truncate">
                          {log.reason || "Unspecified"}
                        </span>
                      </td>

                      {/* Adjusted By */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                            {log.userName
                              ? log.userName.charAt(0).toUpperCase()
                              : "U"}
                          </div>
                          <span className="font-medium text-gray-700 truncate max-w-32">
                            {log.userName || "System"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View adjustment details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredLogs.length}
            itemsPerPage={itemsPerPage}
          />
        </div>
      </Card>

      {/* Log Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Stock Adjustment Dossier"
          size="lg"
        >
          <div className="space-y-5">
            {/* Header info banner */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-gray-500">
                  Adjustment Audit ID #{selectedLog.id}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-0.5">
                  {selectedLog.skuName}
                </h3>
                {selectedLog.brandName && (
                  <p className="text-xs text-gray-500">
                    {selectedLog.brandName}
                  </p>
                )}
              </div>
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
                  getAdjustmentBadge(selectedLog.adjustmentType).classes
                }`}
              >
                {getAdjustmentBadge(selectedLog.adjustmentType).label}
              </span>
            </div>

            {/* Inventory Movement Flow */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
              <p className="text-xs font-semibold text-blue-900 mb-3">
                Stock Transition Metrics
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                  <span className="text-[11px] text-gray-500 font-medium block">
                    Previous Stock
                  </span>
                  <span className="text-lg font-bold text-gray-700">
                    {selectedLog.previousUnits?.toLocaleString() ?? 0}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                  <span className="text-[11px] text-gray-500 font-medium block">
                    Adjustment Delta
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      (selectedLog.deltaUnits || 0) > 0
                        ? "text-emerald-600"
                        : (selectedLog.deltaUnits || 0) < 0
                          ? "text-rose-600"
                          : "text-gray-900"
                    }`}
                  >
                    {(selectedLog.deltaUnits || 0) > 0
                      ? `+${selectedLog.deltaUnits}`
                      : selectedLog.deltaUnits}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                  <span className="text-[11px] text-gray-500 font-medium block">
                    New Stock
                  </span>
                  <span className="text-lg font-bold text-blue-700">
                    {selectedLog.newUnits?.toLocaleString() ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Audit Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-400 font-medium block">
                  Reason Category
                </span>
                <span className="font-semibold text-gray-800 text-sm mt-0.5 block">
                  {selectedLog.reason || "Unspecified"}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-400 font-medium block">
                  Recorded At
                </span>
                <span className="font-semibold text-gray-800 text-sm mt-0.5 block">
                  {formatDate(selectedLog.createdAt)}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-400 font-medium block">
                  Authorized User
                </span>
                <span className="font-semibold text-gray-800 text-sm mt-0.5 block">
                  {selectedLog.userName || "System"} (ID:{" "}
                  {selectedLog.userId || "—"})
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-400 font-medium block">
                  Facility
                </span>
                <span className="font-semibold text-gray-800 text-sm mt-0.5 block">
                  {selectedLog.facilityName || currentFacilityName} (ID:{" "}
                  {selectedLog.facilityId || targetFacilityId})
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-xs text-gray-400 font-medium block">
                Pharmacist Notes & Explanation
              </span>
              <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">
                {selectedLog.notes && selectedLog.notes.trim()
                  ? selectedLog.notes
                  : "No specific notes were entered for this stock adjustment."}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="btn-secondary px-4 py-2 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default StockAdjustmentLogs;
