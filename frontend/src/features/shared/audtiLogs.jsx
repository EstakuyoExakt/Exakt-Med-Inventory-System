import { useState, useMemo } from "react";
import {
  History,
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  User,
  Building2,
  Search,
  Filter,
  Eye,
  Download,
  Calendar,
  Layers,
  FileText,
  Activity,
  Terminal,
  ArrowUpDown,
} from "lucide-react";

// Common Components & Hooks
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";
import useRole from "../../hooks/useRole";
import { ROLES } from "../../config/roles";

// Mock Data
import {
  auditLogs as initialLogs,
  AUDIT_MODULES,
  AUDIT_SEVERITIES,
} from "../../data/auditLogs";

function AuditLogs() {
  const { role, isAdmin } = useRole();
  const [logs] = useState(initialLogs);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("All Modules");
  const [selectedSeverity, setSelectedSeverity] = useState("All Severities");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Modal State
  const [selectedLog, setSelectedLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Role Scoped Logs: Filter logs accessible to the current logged-in user's role
  const roleScopedLogs = useMemo(() => {
    if (!role) return [];
    if (isAdmin) return logs; // Admin sees all logs
    return logs.filter((item) => item.visibleRoles?.includes(role));
  }, [logs, role, isAdmin]);

  // 2. KPI Metrics based on role-scoped logs
  const metrics = useMemo(() => {
    const total = roleScopedLogs.length;
    const critical = roleScopedLogs.filter(
      (l) => l.severity === "critical",
    ).length;
    const warning = roleScopedLogs.filter(
      (l) => l.severity === "warning",
    ).length;
    const success = roleScopedLogs.filter(
      (l) => l.severity === "success",
    ).length;
    const info = roleScopedLogs.filter((l) => l.severity === "info").length;
    return { total, critical, warning, success, info };
  }, [roleScopedLogs]);

  // 3. User Query & Dropdown Filters
  const filteredLogs = useMemo(() => {
    return roleScopedLogs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        log.id.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        log.actionLabel.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q) ||
        log.facility.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.ipAddress.toLowerCase().includes(q);

      const matchesModule =
        selectedModule === "All Modules" || log.module === selectedModule;

      const matchesSeverity =
        selectedSeverity === "All Severities" ||
        log.severity.toLowerCase() === selectedSeverity.toLowerCase();

      return matchesSearch && matchesModule && matchesSeverity;
    });
  }, [roleScopedLogs, searchQuery, selectedModule, selectedSeverity]);

  // 4. Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleModuleChange = (e) => {
    setSelectedModule(e.target.value);
    setCurrentPage(1);
  };

  const handleSeverityChange = (e) => {
    setSelectedSeverity(e.target.value);
    setCurrentPage(1);
  };

  const handleOpenDetails = (log) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLog(null);
  };

  // Severity Badge Formatter
  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return {
          label: "Critical",
          color: "bg-red-50 text-red-700 border-red-200",
          icon: ShieldAlert,
          dotColor: "bg-red-500",
        };
      case "warning":
        return {
          label: "Warning",
          color: "bg-amber-50 text-amber-700 border-amber-200",
          icon: AlertTriangle,
          dotColor: "bg-amber-500",
        };
      case "success":
        return {
          label: "Success",
          color: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
          dotColor: "bg-emerald-500",
        };
      case "info":
      default:
        return {
          label: "Info",
          color: "bg-blue-50 text-blue-700 border-blue-200",
          icon: Info,
          dotColor: "bg-blue-500",
        };
    }
  };

  // Role Badge Formatter
  const getUserRoleBadge = (userRole) => {
    switch (userRole) {
      case ROLES.ADMIN:
        return "bg-purple-50 text-purple-700 border-purple-200";
      case ROLES.PHARMACIST:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case ROLES.PROCUREMENT:
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = [
      "Log ID",
      "Timestamp",
      "User Name",
      "User Role",
      "Action",
      "Module",
      "Severity",
      "Target",
      "Facility",
      "IP Address",
      "Description",
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.userName}"`,
      `"${l.userRole}"`,
      `"${l.actionLabel}"`,
      `"${l.module}"`,
      `"${l.severity}"`,
      `"${l.target}"`,
      `"${l.facility}"`,
      `"${l.ipAddress}"`,
      `"${l.description.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `exakt_med_audit_logs_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-blue-600" />
            <span>Audit & Compliance Logs</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Immutable chronological record of inventory transactions, catalog
            modifications, approvals, and security events
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-secondary text-xs shadow-xs flex items-center gap-1.5"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Scoped Logs */}
        <Card className="p-5 border border-gray-200 shadow-xs hover:border-gray-300 transition-all bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Total Log Entries
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1.5">
                {metrics.total}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 mt-1">
                {isAdmin ? "Universal System Logs" : `Scoped to ${role}`}
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 2. Critical Events */}
        <Card className="p-5 border border-red-200/80 shadow-xs hover:border-red-300 transition-all bg-linear-to-br from-white to-red-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                Critical Events
              </p>
              <h3 className="text-3xl font-extrabold text-red-600 mt-1.5">
                {metrics.critical}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 mt-1 bg-red-100/70 px-2 py-0.5 rounded-full">
                <ShieldAlert className="w-3 h-3" /> High Alert Operations
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 border border-red-200 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 3. Warnings / Adjustments */}
        <Card className="p-5 border border-amber-200/80 shadow-xs hover:border-amber-300 transition-all bg-linear-to-br from-white to-amber-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Discrepancies & Warns
              </p>
              <h3 className="text-3xl font-extrabold text-amber-600 mt-1.5">
                {metrics.warning}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 mt-1 bg-amber-100/70 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> Inventory Reconciliations
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 border border-amber-200 shadow-xs">
              <Shield className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 4. Successful Operations */}
        <Card className="p-5 border border-emerald-200/80 shadow-xs hover:border-emerald-300 transition-all bg-linear-to-br from-white to-emerald-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Verified Clearances
              </p>
              <h3 className="text-3xl font-extrabold text-emerald-600 mt-1.5">
                {metrics.success}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mt-1 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Approvals & Receipts
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Table Container */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/30">
          <div className="w-full md:w-80">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              onClear={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              placeholder="Search by ID, user, target, action..."
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Module Filter */}
            <select
              value={selectedModule}
              onChange={handleModuleChange}
              className="input py-2 text-xs w-full sm:w-44"
            >
              {AUDIT_MODULES.map((mod) => (
                <option key={mod} value={mod}>
                  {mod}
                </option>
              ))}
            </select>

            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={handleSeverityChange}
              className="input py-2 text-xs w-full sm:w-40 capitalize"
            >
              {AUDIT_SEVERITIES.map((sev) => (
                <option key={sev} value={sev} className="capitalize">
                  {sev === "All Severities" ? "All Severities" : `${sev} Level`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Timestamp & Log ID
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Actor & Role
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Action & Module
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Target & Facility
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Severity
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => {
                  const severityInfo = getSeverityBadge(log.severity);
                  const SeverityIcon = severityInfo.icon;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      {/* Timestamp & Log ID */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-700 text-xs bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            {log.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1 font-mono">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{log.timestamp}</span>
                        </div>
                      </td>

                      {/* Actor & Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span>{log.userName}</span>
                        </div>
                        <div className="mt-1">
                          <span
                            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getUserRoleBadge(
                              log.userRole,
                            )}`}
                          >
                            {log.userRole}
                          </span>
                        </div>
                      </td>

                      {/* Action & Module */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-gray-800">
                          {log.actionLabel}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                          <Layers className="w-3 h-3 text-gray-400" />
                          <span>{log.module}</span>
                        </div>
                      </td>

                      {/* Target & Facility */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-mono font-bold text-gray-800">
                          {log.target}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                          <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate max-w-40">
                            {log.facility}
                          </span>
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${severityInfo.color}`}
                        >
                          <SeverityIcon className="w-3 h-3" />
                          {severityInfo.label}
                        </span>
                      </td>

                      {/* Details View Button */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(log)}
                          className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 hover:border-blue-300"
                          title="View Full Audit Log Breakdown"
                          aria-label="View Audit Log Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    <History className="w-9 h-9 mx-auto mb-2 text-gray-300" />
                    <p className="text-base font-semibold text-gray-800">
                      No audit records found
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your search terms or filter selections.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredLogs.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: AUDIT LOG DETAILS BREAKDOWN                       */}
      {/* ======================================================== */}
      <Modal
        isOpen={isModalOpen && Boolean(selectedLog)}
        onClose={handleCloseModal}
        title="Audit Log Entry Breakdown"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            {/* Header Box */}
            <div className="p-4 rounded-xl bg-linear-to-r from-blue-50 to-indigo-50/60 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-800 text-base">
                    {selectedLog.id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      getSeverityBadge(selectedLog.severity).color
                    }`}
                  >
                    {getSeverityBadge(selectedLog.severity).label} Severity
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Recorded on {selectedLog.timestamp}</span>
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-mono font-semibold text-gray-600 bg-white/80 px-2.5 py-1 rounded-md border border-gray-200/80 block">
                  IP: {selectedLog.ipAddress}
                </span>
              </div>
            </div>

            {/* Grid 1: Actor & Target */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 space-y-2">
                <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">
                  Actor Identification
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">User Name:</span>
                    <span className="font-bold text-gray-900">
                      {selectedLog.userName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">User ID:</span>
                    <span className="font-mono text-gray-800 font-semibold">
                      UID-#{selectedLog.userId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Role:</span>
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.2 rounded-full border ${getUserRoleBadge(
                        selectedLog.userRole,
                      )}`}
                    >
                      {selectedLog.userRole}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 space-y-2">
                <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">
                  Operation Scope & Location
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Module:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedLog.module}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Target Entity:</span>
                    <span className="font-mono font-bold text-blue-700">
                      {selectedLog.target}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Facility:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedLog.facility}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Summary */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Action Name:</span>
                <span className="font-bold text-gray-900">
                  {selectedLog.actionLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Action Code:</span>
                <span className="font-mono font-bold text-gray-700 bg-gray-200/60 px-1.5 py-0.5 rounded text-[11px]">
                  {selectedLog.action}
                </span>
              </div>
            </div>

            {/* Detailed Description */}
            <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100 text-xs space-y-1">
              <p className="font-bold text-blue-900 uppercase tracking-wider text-[10px]">
                Full Event Description
              </p>
              <p className="text-gray-800 leading-relaxed">
                {selectedLog.description}
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AuditLogs;
