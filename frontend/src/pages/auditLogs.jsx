import { useMemo, useState } from "react";
import { Logs, Search, Eye } from "lucide-react";

// Components
import ListCard from "../components/listCard";
import Table from "../components/table";
import Modal from "../components/modal";

// Mock Data
import { auditLogs } from "../data/auditLog";

function AuditLogs() {
  const [logs] = useState(auditLogs);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const itemsPerPage = 6;

  const modules = ["Inventory", "Medicine Master", "Authentication"];

  const handleOpenView = (log) => {
    setSelectedLog(log);
    setIsViewModalOpen(true);
  };

  const handleCloseView = () => {
    setIsViewModalOpen(false);
    setSelectedLog(null);
  };

  const filteredLogs = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        log.logId.toLowerCase().includes(q) ||
        log.user.toLowerCase().includes(q) ||
        log.role.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.timestamp.includes(q);

      const matchesModule = filterModule === "" || log.module === filterModule;

      return matchesSearch && matchesModule;
    });
  }, [logs, search, filterModule]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="w-full p-10 max-w-7xl mx-auto max-h-full">
      <ListCard
        className="animate-slide-up"
        title={"Audit Logs"}
        action={
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <Logs className="w-5 h-5" />
          </div>
        }
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredLogs.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      >
        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Log ID, User, Action, Module, or Details..."
              className="input pl-9"
            />
          </div>
          <select
            value={filterModule}
            onChange={(e) => {
              setFilterModule(e.target.value);
              setCurrentPage(1);
            }}
            className="input w-full sm:w-48"
          >
            <option value="">All Modules</option>
            {modules.map((mod) => (
              <option key={mod} value={mod}>
                {mod}
              </option>
            ))}
          </select>
        </div>

        {/* Audit Logs Table */}
        <Table
          headers={[
            "Log ID",
            "Timestamp",
            "User",
            "Action",
            "Module",
            "Actions",
          ]}
          isEmpty={currentLogs.length === 0}
          emptyMessage="No audit logs found."
        >
          {currentLogs.map((log, index) => (
            <tr
              key={log.id}
              className="hover:bg-gray-50 transition-colors animate-slide-up-1 h-12"
              style={{
                animationDelay: `${index * 0.05}s`,
                animationFillMode: "both",
              }}
            >
              <td className="p-2 text-sm font-medium text-slate-700">
                {log.logId}
              </td>
              <td className="p-2 text-sm text-gray-500 whitespace-nowrap">
                {log.timestamp}
              </td>
              <td className="p-2 text-sm">
                <span className="font-medium text-gray-900">{log.user}</span>
                <span className="block text-xs text-gray-400">{log.role}</span>
              </td>
              <td className="p-2 text-sm font-medium text-slate-800">
                {log.action}
              </td>
              <td className="p-2 text-sm">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    log.module === "Inventory"
                      ? "bg-emerald-100 text-emerald-700"
                      : log.module === "Medicine Master"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {log.module}
                </span>
              </td>
              <td className="p-2 text-sm flex justify-center gap-2">
                <button
                  className="cursor-pointer p-2 text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                  title="View Details"
                  onClick={() => handleOpenView(log)}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </ListCard>

      {/* View Audit Log Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={handleCloseView}
        title="Audit Log Details"
      >
        {selectedLog && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Log ID
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedLog.logId}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Timestamp
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedLog.timestamp}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 max-w-sm mx-auto w-full">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">User</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedLog.user}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Action</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedLog.action}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">Role</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedLog.role}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Module</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 mt-0.5 rounded-full text-xs font-medium ${
                      selectedLog.module === "Inventory"
                        ? "bg-emerald-100 text-emerald-700"
                        : selectedLog.module === "Medicine Master"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {selectedLog.module}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-500">
                Activity Details
              </p>
              <p className="text-sm text-gray-800 mt-1 bg-gray-50 p-3 rounded-lg border border-gray-200/60 leading-relaxed">
                {selectedLog.details}
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseView}
                className="btn-secondary"
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
