import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  ShieldAlert,
  Layers,
  Clock,
  User,
  CheckCircle2,
  Building2,
  Boxes,
  Activity,
  History,
} from "lucide-react";

// Existing Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Dropdown from "../../components/common/dropdown";
import Pagination from "../../components/common/pagination";
import { Skeleton } from "../../components/common/skeleton";

// Services & Hooks
import bincardService from "../../services/bincard";
import useAuth from "../../hooks/useAuth";
import useRole from "../../hooks/useRole";

const DATE_PRESETS = [
  { value: "ALL", label: "All Time" },
  { value: "30_DAYS", label: "Last 30 Days" },
  { value: "THIS_MONTH", label: "This Month" },
  { value: "90_DAYS", label: "Last 90 Days" },
  { value: "CUSTOM", label: "Custom Range" },
];

const TRANSACTION_TYPES = [
  { value: "ALL", label: "All Movements" },
  { value: "BATCH_RECEIPT", label: "PO Receipts Only (+)" },
  { value: "STOCK_ADDITION", label: "Manual Additions (+)" },
  { value: "STOCK_DEDUCTION", label: "Manual Deductions (-)" },
  { value: "BATCH_EXPIRY", label: "Expiry Deductions (-)" },
];

function BinCard() {
  const { skuId: urlSkuId } = useParams();
  const navigate = useNavigate();
  const { facility } = useAuth();
  const { isSuperAdmin } = useRole();

  // Facility scope
  const facilityId = facility?.id;
  const facilityName = facility?.name || "Active Facility";

  // State: SKUs list in facility for selection
  const [facilitySkus, setFacilitySkus] = useState([]);
  const [selectedSkuId, setSelectedSkuId] = useState(urlSkuId || "");
  const [loadingSkus, setLoadingSkus] = useState(true);

  // State: Bin Card Data
  const [binCardData, setBinCardData] = useState(null);
  const [loadingBinCard, setLoadingBinCard] = useState(Boolean(urlSkuId));
  const [error, setError] = useState(null);

  // Filters
  const [datePreset, setDatePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination for ledger
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 1. Fetch SKUs for the facility selector
  const fetchFacilitySkus = useCallback(async () => {
    if (!facilityId) {
      setLoadingSkus(false);
      setLoadingBinCard(false);
      return;
    }
    try {
      setLoadingSkus(true);
      setError(null);
      const skus = await bincardService.getFacilitySkus(facilityId);
      const skuList = Array.isArray(skus) ? skus : [];
      setFacilitySkus(skuList);
      if (!selectedSkuId && skuList.length > 0) {
        // Default to first SKU if none specified
        setSelectedSkuId(String(skuList[0].id));
      } else if (skuList.length === 0) {
        setLoadingBinCard(false);
      }
    } catch (err) {
      console.error("Failed to load facility SKUs for Bin Card:", err);
      setError("Unable to load SKUs for this facility.");
      setLoadingBinCard(false);
    } finally {
      setLoadingSkus(false);
    }
  }, [facilityId, selectedSkuId]);

  useEffect(() => {
    fetchFacilitySkus();
  }, [fetchFacilitySkus]);

  // Keep selectedSkuId in sync with urlSkuId if present
  useEffect(() => {
    if (urlSkuId && urlSkuId !== selectedSkuId) {
      setSelectedSkuId(urlSkuId);
    }
  }, [urlSkuId, selectedSkuId]);

  // 2. Compute date range based on preset
  const computedDates = useMemo(() => {
    if (datePreset === "CUSTOM") {
      return { start: startDate || null, end: endDate || null };
    }
    const today = new Date();
    const formatDate = (d) => d.toISOString().split("T")[0];

    if (datePreset === "30_DAYS") {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      return { start: formatDate(past), end: formatDate(today) };
    }
    if (datePreset === "THIS_MONTH") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: formatDate(start), end: formatDate(today) };
    }
    if (datePreset === "90_DAYS") {
      const past = new Date();
      past.setDate(today.getDate() - 90);
      return { start: formatDate(past), end: formatDate(today) };
    }
    return { start: null, end: null };
  }, [datePreset, startDate, endDate]);

  // 3. Fetch Bin Card for currently selected SKU
  const fetchBinCard = useCallback(async () => {
    if (!facilityId || !selectedSkuId) {
      setBinCardData(null);
      setLoadingBinCard(false);
      return;
    }

    try {
      setLoadingBinCard(true);
      setError(null);
      const data = await bincardService.getSkuBinCard(
        selectedSkuId,
        facilityId,
        computedDates.start,
        computedDates.end
      );
      setBinCardData(data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to fetch Bin Card:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load Bin Card for the selected SKU."
      );
      setBinCardData(null);
    } finally {
      setLoadingBinCard(false);
    }
  }, [facilityId, selectedSkuId, computedDates.start, computedDates.end]);

  useEffect(() => {
    fetchBinCard();
  }, [fetchBinCard]);

  // Handle SKU switch
  const handleSelectSku = (newSkuId) => {
    setSelectedSkuId(newSkuId);
    navigate(`/admin/bin-cards/${newSkuId}`, { replace: true });
  };

  // 4. Filter and search entries client-side
  const filteredEntries = useMemo(() => {
    if (!binCardData?.entries) return [];

    let list = binCardData.entries;

    // Movement type filter
    if (selectedType !== "ALL") {
      list = list.filter((e) => e.transactionType === selectedType);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.referenceNumber?.toLowerCase().includes(q) ||
          e.batchNum?.toLowerCase().includes(q) ||
          e.reason?.toLowerCase().includes(q) ||
          e.notes?.toLowerCase().includes(q) ||
          e.performedBy?.toLowerCase().includes(q) ||
          e.typeLabel?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [binCardData?.entries, selectedType, searchQuery]);

  // Pagination slice
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(start, start + itemsPerPage);
  }, [filteredEntries, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage) || 1;

  // 5. Export CSV
  const handleExportCsv = () => {
    if (!binCardData || !filteredEntries.length) return;

    const headers = [
      "Date & Time",
      "Transaction Type",
      "Reference / PO / Doc No.",
      "Batch / Lot No.",
      "Expiry Date",
      "Inflow (+)",
      "Outflow (-)",
      "Running Balance",
      "Reason",
      "Authorized By",
      "Notes",
    ];

    const rows = filteredEntries.map((e) => [
      `"${e.timestamp ? e.timestamp.replace("T", " ") : ""}"`,
      `"${e.typeLabel || e.transactionType}"`,
      `"${e.referenceNumber || ""}"`,
      `"${e.batchNum || "-"}"`,
      `"${e.expiryDate || "-"}"`,
      e.quantityIn != null ? e.quantityIn : "",
      e.quantityOut != null ? e.quantityOut : "",
      e.balanceAfter != null ? e.balanceAfter : "",
      `"${(e.reason || "").replace(/"/g, '""')}"`,
      `"${e.performedBy || ""}"`,
      `"${(e.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const skuName = (binCardData.header?.name || "SKU").replace(/[/\\?%*:|"<>]/g, "_").trim();
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `BinCard_${skuName}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  // Helpers for Status Styling
  const getStatusBadge = (status) => {
    switch (status) {
      case "CRITICAL":
      case "OUT_OF_STOCK":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "LOW_STOCK":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "OVERSTOCK":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "NORMAL":
      default:
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
  };

  const getTransactionTypeBadge = (type) => {
    switch (type) {
      case "BATCH_RECEIPT":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "STOCK_ADDITION":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "STOCK_DEDUCTION":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "BATCH_EXPIRY":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };


  const skuOptions = useMemo(() => {
    return facilitySkus.map((s) => ({
      value: String(s.id),
      label: `${s.name}${s.brandName ? ` (${s.brandName})` : ""}`,
    }));
  }, [facilitySkus]);

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              SKU Bin Card
            </h1>
            {/* Active Facility Indicator */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
              <Building2 className="w-3.5 h-3.5" />
              <span>{facilityName}</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Displaying item-level chronological ledger, running balances, and stock movements
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => {
              fetchFacilitySkus();
              if (selectedSkuId) fetchBinCard();
            }}
            disabled={loadingBinCard || loadingSkus}
            className="btn-secondary p-2.5 text-gray-600 hover:text-blue-600 shadow-xs"
            title="Refresh Bin Card"
            aria-label="Refresh Bin Card"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loadingBinCard || loadingSkus ? "animate-spin text-blue-600" : ""
              }`}
            />
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!binCardData || !filteredEntries.length}
            className="btn-secondary self-start sm:self-auto shadow-sm flex items-center gap-1.5"
            title="Export CSV"
          >
            <Download className="w-4 h-4 text-gray-600" />
            <span>Export CSV</span>
          </button>

        </div>
      </div>


      {/* 2. SKU Selector Bar */}
      <Card className="p-4 animate-slide-up-1 relative z-30">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="flex items-center gap-2 min-w-35 text-sm font-semibold text-gray-700">
            <Boxes className="w-4 h-4 text-blue-600" />
            <span>Select SKU:</span>
          </div>

          <div className="flex-1">
            <Dropdown
              options={skuOptions}
              value={selectedSkuId}
              onChange={(e) => handleSelectSku(e.target.value)}
              placeholder={
                loadingSkus
                  ? "Loading facility SKUs..."
                  : skuOptions.length === 0
                  ? "No SKUs found in this facility"
                  : "Search or pick an SKU to view Bin Card..."
              }
              disabled={loadingSkus || skuOptions.length === 0}
              size="md"
            />
          </div>
        </div>
      </Card>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 flex items-start gap-3 animate-slide-up">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Unable to display Bin Card</p>
            <p className="text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loadingBinCard && (
        <div className="space-y-6 animate-slide-up-2">
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          </Card>
          <Card className="p-6">
            <Skeleton className="h-64 rounded-lg" />
          </Card>
        </div>
      )}

      {/* 3. Bin Card Content (When Data Loaded) */}
      {!loadingBinCard && binCardData && (
        <>
          {/* SKU Information & Metric Cards */}
          <Card className="p-6 border-slate-200 shadow-md animate-slide-up-2 relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-100">
              {/* Medicine Identity */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900">
                    {binCardData.header?.name}
                  </h2>
                  {binCardData.header?.brandName && (
                    <span className="text-sm font-medium text-gray-500">
                      ({binCardData.header?.brandName})
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                      binCardData.header?.stockStatus
                    )}`}
                  >
                    {binCardData.header?.stockStatus?.replace("_", " ")}
                  </span>
                </div>

                <p className="text-xs text-gray-500">
                  {binCardData.header?.genericName || "Generic Formulation"}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-600 pt-1 flex-wrap">
                  <span>Form: <strong>{binCardData.header?.dosageForm || "-"}</strong></span>
                  <span>Packaging: <strong>{binCardData.header?.packagingUnit || "Units"}</strong></span>
                </div>
              </div>

              {/* Threshold Indicators */}
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-center px-3 border-r border-slate-200">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Min Level
                  </p>
                  <p className="text-base font-extrabold text-slate-700 mt-0.5">
                    {binCardData.header?.minimumLevel?.toLocaleString()}
                  </p>
                </div>
                <div className="text-center px-3 border-r border-slate-200">
                  <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                    Reorder Point
                  </p>
                  <p className="text-base font-extrabold text-blue-700 mt-0.5">
                    {binCardData.header?.reorderLevel?.toLocaleString()}
                  </p>
                </div>
                <div className="text-center px-3">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Max Level
                  </p>
                  <p className="text-base font-extrabold text-slate-700 mt-0.5">
                    {binCardData.header?.maximumLevel?.toLocaleString() || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Metric KPI Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              {/* Current Units */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <div className="flex items-center justify-between text-blue-700">
                  <span className="text-xs font-semibold">Current On-Hand</span>
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-black text-blue-900 mt-1">
                  {binCardData.header?.currentUnits?.toLocaleString()}
                </p>
                <p className="text-[11px] text-blue-600 mt-0.5">
                  Available in facility inventory
                </p>
              </div>

              {/* Total Inflow */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="text-xs font-semibold">Total Inflow (+)</span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-black text-emerald-900 mt-1">
                  +{binCardData.header?.totalReceived?.toLocaleString()}
                </p>
                <p className="text-[11px] text-emerald-600 mt-0.5">
                  Received via purchase orders
                </p>
              </div>

              {/* Total Outflow */}
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                <div className="flex items-center justify-between text-rose-700">
                  <span className="text-xs font-semibold">Total Outflow (-)</span>
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                </div>
                <p className="text-2xl font-black text-rose-900 mt-1">
                  -{binCardData.header?.totalDeducted?.toLocaleString()}
                </p>
                <p className="text-[11px] text-rose-600 mt-0.5">
                  Deductions & expired write-offs
                </p>
              </div>

              {/* Net Adjustments */}
              <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                <div className="flex items-center justify-between text-purple-700">
                  <span className="text-xs font-semibold">Net Adjustments</span>
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-2xl font-black text-purple-900 mt-1">
                  {binCardData.header?.totalAdjusted > 0 ? "+" : ""}
                  {binCardData.header?.totalAdjusted?.toLocaleString()}
                </p>
                <p className="text-[11px] text-purple-600 mt-0.5">
                  Manual physical reconciliations
                </p>
              </div>
            </div>
          </Card>

          {/* 4. The Bin Card Ledger Table with Integrated Search & Filters */}
          <Card className="p-0 shadow-md border-gray-200 animate-slide-up-3 relative z-20">
            <div className="p-4 border-b border-gray-100 space-y-3 relative z-30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Stock Movement Ledger
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Showing {filteredEntries.length} chronological inventory events
                  </p>
                </div>
              </div>

              {/* Merged Search & Filter Controls */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
                <div className="flex-1 max-w-md">
                  <SearchBar
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by PO #, Batch #, reason, or actor..."
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Movement Type Filter */}
                  <div className="min-w-45">
                    <Dropdown
                      options={TRANSACTION_TYPES}
                      value={selectedType}
                      onChange={(e) => {
                        setSelectedType(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="All Movements"
                      size="sm"
                    />
                  </div>

                  {/* Date Range Preset */}
                  <div className="min-w-40">
                    <Dropdown
                      options={DATE_PRESETS}
                      value={datePreset}
                      onChange={(e) => {
                        setDatePreset(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Date Range"
                      size="sm"
                    />
                  </div>

                  {/* Custom Date Inputs if CUSTOM selected */}
                  {datePreset === "CUSTOM" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="input py-1 px-2.5 text-xs w-36"
                        title="Start Date"
                      />
                      <span className="text-xs text-gray-400">to</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="input py-1 px-2.5 text-xs w-36"
                        title="End Date"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>


            <div className="overflow-x-auto rounded-b-xl">
              <table className="w-full text-left text-sm text-gray-700">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">
                      Date & Time
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      Type
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      Doc / PO #
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      Batch / Lot #
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      Expiry Date
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right font-mono">
                      In (+)
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right font-mono">
                      Out (-)
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right font-mono bg-blue-50/50 text-blue-900">
                      Balance
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      Reason / Notes
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      Authorized By
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedEntries.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                        <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold">No stock movements recorded</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {searchQuery || selectedType !== "ALL"
                            ? "Try resetting your search or movement filter"
                            : "New PO receipts or stock adjustments will appear here"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedEntries.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-blue-50/30 transition-colors animate-slide-up"
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        {/* Timestamp */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-600">
                          {entry.timestamp ? (
                            <div>
                              <p className="font-semibold text-gray-900">
                                {entry.timestamp.split("T")[0]}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {entry.timestamp.split("T")[1]?.slice(0, 5) || ""}
                              </p>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Movement Type */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getTransactionTypeBadge(
                              entry.transactionType
                            )}`}
                          >
                            {entry.typeLabel || entry.transactionType}
                          </span>
                        </td>

                        {/* Reference / PO # */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono font-semibold text-gray-800">
                          {entry.referenceNumber || "—"}
                        </td>

                        {/* Batch Number */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-gray-700">
                          {entry.batchNum || "—"}
                        </td>

                        {/* Expiry Date */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-600">
                          {entry.expiryDate || "—"}
                        </td>

                        {/* Inflow (+) */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-right font-mono font-bold text-emerald-600">
                          {entry.quantityIn != null ? `+${entry.quantityIn.toLocaleString()}` : "—"}
                        </td>

                        {/* Outflow (-) */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-right font-mono font-bold text-rose-600">
                          {entry.quantityOut != null ? `-${entry.quantityOut.toLocaleString()}` : "—"}
                        </td>

                        {/* Running Balance */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-right font-mono font-black text-blue-900 bg-blue-50/40">
                          {entry.balanceAfter != null ? entry.balanceAfter.toLocaleString() : "—"}
                        </td>

                        {/* Reason / Notes */}
                        <td className="px-5 py-3.5 text-xs text-gray-600 max-w-xs truncate" title={entry.notes || entry.reason}>
                          <p className="font-medium text-gray-800">{entry.reason || "—"}</p>
                          {entry.notes && (
                            <p className="text-[11px] text-gray-400 truncate">{entry.notes}</p>
                          )}
                        </td>

                        {/* Authorized By */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3 h-3 text-gray-400" />
                            <span>{entry.performedBy || "System"}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredEntries.length)} of{" "}
                  {filteredEntries.length} ledger movements
                </p>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  showInfo={false}
                />
              </div>
            )}
          </Card>
        </>
      )}

      {/* No SKU Selected or Empty Facility State */}
      {!loadingBinCard && !loadingSkus && !binCardData && !error && (
        <Card className="p-12 text-center text-gray-500 animate-slide-up-2">
          <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-700">
            {facilitySkus.length === 0
              ? "No SKUs Available in Facility"
              : "No SKU Selected"}
          </h3>
          <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
            {facilitySkus.length === 0
              ? "There are currently no medicines or SKUs registered in this facility. Once items are added, you can inspect their complete stock bin card and transaction ledgers here."
              : "Please pick an SKU from the dropdown above to inspect its complete stock bin card and transaction ledger."}
          </p>
        </Card>
      )}
    </div>
  );
}

export default BinCard;
