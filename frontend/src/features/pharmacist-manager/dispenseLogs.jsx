import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ClipboardCheck,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  User,
  Phone,
  Pill,
  Building2,
  Calendar,
  Check,
  Loader2,
  ShieldAlert,
  ArrowRight,
  Boxes,
} from "lucide-react";

// Common Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";
import SuccessModal from "../../components/common/successModal";
import Dropdown from "../../components/common/dropdown";
import { SkeletonTable } from "../../components/common/skeleton";

// Services & Hooks
import dispensedLogService from "../../services/dispensedLog";
import useAuth from "../../hooks/useAuth";
import useRole from "../../hooks/useRole";
import { ROLES } from "../../config/roles";

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

function DispenseLogs() {
  const { facility, user } = useAuth();
  const { isSuperAdmin, isPharmacist } = useRole();

  // Access validation: Strictly for SuperAdmin and Pharmacist
  const isAuthorized = isSuperAdmin || isPharmacist;

  const targetFacilityId = useMemo(() => {
    // If pharmacist, restrict to facility. If superadmin without facility selected, can be null (all)
    return facility?.id || null;
  }, [facility]);

  // State Management
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals & In-flight Action State
  const [selectedLog, setSelectedLog] = useState(null);
  const [logToReceive, setLogToReceive] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successInfo, setSuccessInfo] = useState({
    isOpen: false,
    message: "",
  });

  // Fetch all dispense logs
  const fetchLogs = useCallback(async () => {
    if (!isAuthorized) return;
    try {
      setIsLoading(true);
      setError(null);
      // Fetch logs for current facility (or all if super admin and no facility specified)
      const data = await dispensedLogService.getAll(
        targetFacilityId,
        selectedStatus === "ALL" ? null : selectedStatus,
      );
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load dispense logs:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load dispense logs. Please verify your connection.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, targetFacilityId, selectedStatus]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle Mark as Received
  const handleMarkAsReceived = async () => {
    if (!logToReceive) return;
    try {
      setIsUpdating(true);
      const updatedLog = await dispensedLogService.markAsReceived(
        logToReceive.id,
      );

      // Update state in place
      setLogs((prev) =>
        prev.map((item) => (item.id === logToReceive.id ? updatedLog : item)),
      );

      // Also update selectedLog if modal was viewing it
      if (selectedLog && selectedLog.id === logToReceive.id) {
        setSelectedLog(updatedLog);
      }

      const receivedPatient = logToReceive.patientName || "Recipient";
      setLogToReceive(null);
      setSuccessInfo({
        isOpen: true,
        message: `Dispense log #${updatedLog.id} marked as Received for ${receivedPatient}.`,
      });
    } catch (err) {
      console.error("Failed to update status to Received:", err);
      alert(
        err.response?.data?.message ||
          "Failed to mark dispense as received. Please try again.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Client-side search & filtering
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Status filter
      if (
        selectedStatus !== "ALL" &&
        log.status?.toUpperCase() !== selectedStatus.toUpperCase()
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const patientMatch = (log.patientName || "")
          .toLowerCase()
          .includes(query);
        const contactMatch = (log.contactNumber || "")
          .toLowerCase()
          .includes(query);
        const skuMatch = (log.skuName || "").toLowerCase().includes(query);
        const brandMatch = (log.brandName || "").toLowerCase().includes(query);
        const genericMatch = (log.genericName || "")
          .toLowerCase()
          .includes(query);
        const facilityMatch = (log.facilityName || "")
          .toLowerCase()
          .includes(query);
        const idMatch = String(log.id).includes(query);

        return (
          patientMatch ||
          contactMatch ||
          skuMatch ||
          brandMatch ||
          genericMatch ||
          facilityMatch ||
          idMatch
        );
      }

      return true;
    });
  }, [logs, selectedStatus, searchQuery]);

  // Pagination calculation
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Statistics calculation
  const stats = useMemo(() => {
    let pendingCount = 0;
    let receivedCount = 0;
    let totalUnits = 0;

    logs.forEach((log) => {
      if (log.status?.toUpperCase() === "PENDING") {
        pendingCount += 1;
      } else if (log.status?.toUpperCase() === "RECEIVED") {
        receivedCount += 1;
      }
      totalUnits += Number(log.unitsDispensed || 0);
    });

    return {
      total: logs.length,
      pending: pendingCount,
      received: receivedCount,
      totalUnits,
    };
  }, [logs]);

  // Status Filter Options for Dropdown
  const statusOptions = [
    { value: "ALL", label: "All Statuses" },
    { value: "Pending", label: "Pending Hand-off" },
    { value: "Received", label: "Received" },
  ];

  // Restrict access if unauthorized
  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-4xl mx-auto animate-slide-up">
        <Card className="text-center py-12 px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Access Restricted
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            This module is strictly reserved for{" "}
            <strong>Super Administrators</strong> and{" "}
            <strong>Pharmacist Managers</strong>. You do not have sufficient
            permissions to view medicine dispense logs.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Medicine Dispense Logs
              </h1>
              <p className="text-sm text-slate-500">
                Track patient medicine dispenses and update recipient hand-off
                status.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isLoading}
            className="btn-secondary"
            title="Refresh logs"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
        {/* Card 1: Total Dispenses */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Dispenses
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {stats.total}
            </span>
            <span className="text-xs text-slate-500">records</span>
          </div>
        </div>

        {/* Card 2: Pending Hand-offs */}
        <div className="bg-white rounded-xl border border-amber-200/80 bg-linear-to-br from-white to-amber-50/20 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Pending Hand-offs
            </span>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-800">
              {stats.pending}
            </span>
            <span className="text-xs text-amber-600">awaiting receipt</span>
          </div>
        </div>

        {/* Card 3: Received Confirmed */}
        <div className="bg-white rounded-xl border border-emerald-200/80 bg-linear-to-br from-white to-emerald-50/20 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Received Confirmed
            </span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-800">
              {stats.received}
            </span>
            <span className="text-xs text-emerald-600">completed</span>
          </div>
        </div>

        {/* Card 4: Total Units Dispensed */}
        <div className="bg-white rounded-xl border border-indigo-200/80 bg-linear-to-br from-white to-indigo-50/20 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
              Total Units Dispensed
            </span>
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-900">
              {stats.totalUnits.toLocaleString()}
            </span>
            <span className="text-xs text-indigo-600">units</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="animate-slide-up-1">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="flex-1 max-w-md">
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
              placeholder="Search by patient, contact, medicine, brand..."
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-48">
              <Dropdown
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                options={statusOptions}
                size="sm"
              />
            </div>

            {(searchQuery || selectedStatus !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("ALL");
                  setCurrentPage(1);
                }}
                className="btn-secondary text-xs px-3 py-2 text-slate-600 hover:text-slate-900"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Unable to load dispense logs</p>
              <p className="text-rose-700 mt-0.5">{error}</p>
            </div>
            <button
              onClick={fetchLogs}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table Content */}
        {isLoading ? (
          <SkeletonTable rows={6} columns={6} />
        ) : paginatedLogs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <ClipboardCheck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              No Dispense Logs Found
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery || selectedStatus !== "ALL"
                ? "No logs match your filter criteria. Try clearing filters or searching another keyword."
                : "No medicine dispenses have been logged yet for this facility."}
            </p>
            {(searchQuery || selectedStatus !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("ALL");
                  setCurrentPage(1);
                }}
                className="btn-secondary mt-4 text-xs"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5">Recipient Patient</th>
                  <th className="px-4 py-3.5">Medicine / SKU</th>
                  <th className="px-4 py-3.5 text-center">Units Dispensed</th>
                  <th className="px-4 py-3.5">Dispensed At</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginatedLogs.map((log) => {
                  const isPending = log.status?.toUpperCase() === "PENDING";
                  const isReceived = log.status?.toUpperCase() === "RECEIVED";

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Recipient Column */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {log.patientName || "Unknown Patient"}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>
                                {log.contactNumber || "No contact number"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Medicine / SKU Column */}
                      <td className="px-4 py-3.5">
                        <div>
                          <div className="font-medium text-slate-900 flex items-center gap-1.5">
                            <Pill className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>
                              {log.brandName || log.skuName || "Medicine SKU"}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {log.genericName || log.skuName || "—"}
                          </div>
                          {log.facilityName && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3" />
                              <span>{log.facilityName}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Units Dispensed */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {log.unitsDispensed || 0} units
                        </span>
                      </td>

                      {/* Dispensed At */}
                      <td className="px-4 py-3.5">
                        <div className="text-slate-700 text-xs font-medium">
                          {formatDate(log.dispensedAt)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 animate-pulse" />
                            Pending
                          </span>
                        ) : isReceived ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Received
                            </span>
                            {log.receivedAt && (
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {formatDate(log.receivedAt)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {log.status || "Unknown"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Received Button for Pending Status */}
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => setLogToReceive(log)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
                              title="Mark this dispense as Received"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Received</span>
                            </button>
                          )}

                          {isReceived && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium px-2 py-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Done
                            </span>
                          )}

                          {/* View Details Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="View full dispense log details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </Card>

      {/* Confirmation Modal to Mark as Received */}
      <Modal
        isOpen={Boolean(logToReceive)}
        onClose={() => !isUpdating && setLogToReceive(null)}
        title="Confirm Dispense Receipt"
        size="md"
      >
        {logToReceive && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-100 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-sm">
                <h4 className="font-bold text-emerald-900">
                  Update status to Received?
                </h4>
                <p className="text-emerald-700 mt-1">
                  Please confirm that the patient or recipient has physically
                  received the prescribed units. This action will record the
                  receipt timestamp.
                </p>
              </div>
            </div>

            {/* Recipient & Medicine Summary */}
            <div className="rounded-xl border border-gray-200 p-4 space-y-2.5 bg-slate-50/60 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-slate-500">Patient Name:</span>
                <span className="font-bold text-slate-900">
                  {logToReceive.patientName || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-slate-500">Contact Number:</span>
                <span className="font-semibold text-slate-800">
                  {logToReceive.contactNumber || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-slate-500">Medicine:</span>
                <span className="font-semibold text-slate-800">
                  {logToReceive.brandName || logToReceive.skuName || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-slate-500">Quantity Dispensed:</span>
                <span className="font-bold text-indigo-700">
                  {logToReceive.unitsDispensed} units
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Dispensed On:</span>
                <span className="text-slate-700">
                  {formatDate(logToReceive.dispensedAt)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setLogToReceive(null)}
                disabled={isUpdating}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkAsReceived}
                disabled={isUpdating}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition duration-200 ease-in-out cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirm Received</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Details View Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={`Dispense Log Details #${selectedLog?.id || ""}`}
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-5">
            {/* Status Header Banner */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Current Status:
                </span>
                {selectedLog.status?.toUpperCase() === "PENDING" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-3.5 h-3.5" />
                    Pending Receipt
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Received
                  </span>
                )}
              </div>

              {selectedLog.status?.toUpperCase() === "PENDING" && (
                <button
                  type="button"
                  onClick={() => {
                    const current = selectedLog;
                    setSelectedLog(null);
                    setLogToReceive(current);
                  }}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Received</span>
                </button>
              )}
            </div>

            {/* Recipient Information Section */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Recipient Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-gray-200 bg-white">
                <div>
                  <span className="text-xs text-slate-400 block">
                    Patient Name
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {selectedLog.patientName || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">
                    Contact Number
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {selectedLog.contactNumber || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Medicine & Facility Section */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5" />
                Medicine & Quantity
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-gray-200 bg-white">
                <div>
                  <span className="text-xs text-slate-400 block">
                    Brand Name / SKU
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {selectedLog.brandName || selectedLog.skuName || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">
                    Generic Name
                  </span>
                  <span className="text-sm text-slate-700">
                    {selectedLog.genericName || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">
                    Units Dispensed
                  </span>
                  <span className="text-base font-bold text-indigo-700">
                    {selectedLog.unitsDispensed} units
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">
                    Dispensed Facility
                  </span>
                  <span className="text-sm font-medium text-slate-800">
                    {selectedLog.facilityName || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline Section */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Timeline
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-gray-200 bg-slate-50/50">
                <div>
                  <span className="text-xs text-slate-400 block">
                    Dispensed At
                  </span>
                  <span className="text-xs font-medium text-slate-800">
                    {formatDate(selectedLog.dispensedAt)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">
                    Received At
                  </span>
                  <span className="text-xs font-medium text-slate-800">
                    {formatDate(selectedLog.receivedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Success Modal */}
      <SuccessModal
        isOpen={successInfo.isOpen}
        onClose={() => setSuccessInfo({ isOpen: false, message: "" })}
        title="Status Updated"
        message={successInfo.message}
        confirmText="OK"
        autoCloseMs={3500}
      />
    </div>
  );
}

export default DispenseLogs;
