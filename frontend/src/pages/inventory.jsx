import { useMemo, useState } from "react";
import {
  Pill,
  Boxes,
  ArrowDown,
  CircleAlert,
  TriangleAlert,
  PackageOpen,
  Search,
} from "lucide-react";

// Components
import Card from "../components/card";
import Modal from "../components/modal";

// Mock Data
import { medicines } from "../data/medicine";
import { batches } from "../data/batch";

function Inventory() {
  const currentDate = new Date("2026-08-19");

  // Total Medicines
  const totalMedicines = medicines.length;

  // Total Stock
  const totalStock = batches.reduce((sum, b) => sum + (b.quantity || 0), 0);

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

  // Low Stock (qty > 0 and <= 15)
  const lowStockCount = useMemo(
    () =>
      medicines.filter((med) => {
        const qty = medicineStockMap[med.medCode] ?? 0;
        return qty > 0 && qty <= 15;
      }).length,
    [medicineStockMap],
  );

  // Out of Stock (qty === 0)
  const outOfStockCount = useMemo(
    () =>
      medicines.filter((med) => {
        const qty = medicineStockMap[med.medCode] ?? 0;
        return qty === 0;
      }).length,
    [medicineStockMap],
  );

  // Near Expiry (within 90 days)
  const nearExpiryCount = useMemo(
    () =>
      batches.filter((batch) => {
        const exp = new Date(batch.expiryDate);
        const diffDays = Math.ceil((exp - currentDate) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 90;
      }).length,
    [],
  );

  // Expired (past expiry date)
  const expiredCount = useMemo(
    () =>
      batches.filter((batch) => new Date(batch.expiryDate) < currentDate)
        .length,
    [],
  );

  // Inventory List State
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const filteredBatches = useMemo(() => {
    const q = search.toLowerCase();
    return batches.filter((batch) => {
      const matchesSearch =
        batch.medicine.toLowerCase().includes(q) ||
        batch.batchId.toLowerCase().includes(q) ||
        batch.expiryDate.includes(q) ||
        String(batch.quantity).includes(q);
      const matchesStatus = filterStatus === "" || batch.stock === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [search, filterStatus]);

  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBatches = filteredBatches.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  return (
    <div className="w-full p-10 max-w-7xl mx-auto overflow-y-auto max-h-full">
      {/* Total Cards */}
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-5 animate-slide-up">
          <Card
            title={"Total Medicines"}
            action={
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <Pill className="w-5 h-5" />
              </div>
            }
          >
            <span className="text-3xl font-bold text-slate-900">
              {totalMedicines}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Registered in catalogue
            </p>
          </Card>
          <Card
            title={"Total Stock"}
            action={
              <div className="p-2.5 rounded-lg bg-green-50 text-green-600">
                <Boxes className="w-5 h-5" />
              </div>
            }
          >
            <span className="text-3xl font-bold text-slate-900">
              {totalStock.toLocaleString()}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Units across all batches
            </p>
          </Card>
          <Card
            title={"Low Stock"}
            action={
              <div className="p-2.5 rounded-lg bg-yellow-50 text-yellow-600">
                <ArrowDown className="w-5 h-5" />
              </div>
            }
          >
            <span className="text-3xl font-bold text-amber-600">
              {lowStockCount}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Medicines below threshold
            </p>
          </Card>
        </div>
        <div className="grid grid-cols-3 gap-5 animate-slide-up-1">
          <Card
            title={"Out of Stock"}
            action={
              <div className="p-2.5 rounded-lg bg-orange-50 text-orange-600">
                <PackageOpen className="w-5 h-5" />
              </div>
            }
          >
            <span className="text-3xl font-bold text-rose-600">
              {outOfStockCount}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Medicines with zero stock
            </p>
          </Card>
          <Card
            title={"Near Expiry"}
            action={
              <div className="p-2.5 rounded-lg bg-yellow-50 text-yellow-600">
                <CircleAlert className="w-5 h-5" />
              </div>
            }
          >
            <span className="text-3xl font-bold text-amber-600">
              {nearExpiryCount}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Batches expiring within 90 days
            </p>
          </Card>
          <Card
            title={"Expired"}
            action={
              <div className="p-2.5 rounded-lg bg-red-50 text-red-600">
                <TriangleAlert className="w-5 h-5" />
              </div>
            }
          >
            <span className="text-3xl font-bold text-rose-600">
              {expiredCount}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Batches past expiry date
            </p>
          </Card>
        </div>
      </div>

      {/* Inventory List Card */}
      <div className="mt-5">
        <Card
          title={"Inventory List"}
          action={
            <div className="flex gap-5">
              <button className="btn-primary">Receive Stock</button>
              <button className="btn-primary">Stock Adjustment</button>
              <button className="btn-primary">Transfer Stock</button>
            </div>
          }
          className="animate-slide-up-3"
        >
          <div className="flex flex-col sm:flex-row gap-3 mb-4 mt-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by Medicine, Batch No. or Expiry..."
                className="input pl-9"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="input w-full sm:w-48"
            >
              <option value="">All Status</option>
              <option value="Normal">Normal</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b bg-gray-50 text-gray-600 text-sm">
                <th className="p-3 font-medium">Batch ID</th>
                <th className="p-3 font-medium">Medicine</th>
                <th className="p-3 font-medium">Expiry Date</th>
                <th className="p-3 font-medium">Quantity</th>
                <th className="p-3 font-medium">Stock</th>
              </tr>
            </thead>
            <tbody key={currentPage}>
              {currentBatches.map((batch, index) => (
                <tr
                  key={batch.id}
                  className="hover:bg-gray-50 transition-colors animate-slide-up-3"
                  style={{
                    animationDelay: `${index * 0.05}s`,
                    animationFillMode: "both",
                  }}
                >
                  <td className="p-2 text-sm font-medium text-slate-700">
                    {batch.batchId}
                  </td>
                  <td className="p-2 text-sm">{batch.medicine}</td>
                  <td className="p-2 text-sm">{batch.expiryDate}</td>
                  <td className="p-2 text-sm">{batch.quantity}</td>
                  <td className="p-2 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        batch.stock === "Low Stock"
                          ? "bg-amber-100 text-amber-700"
                          : batch.stock === "Out of Stock"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {batch.stock}
                    </span>
                  </td>
                </tr>
              ))}
              {currentBatches.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-gray-500">
                    No batches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {filteredBatches.length > itemsPerPage && (
            <div className="flex justify-between items-center pt-6 pr-5 pl-5">
              <span className="text-sm text-gray-500">
                Showing {indexOfFirstItem + 1} to{" "}
                {Math.min(indexOfLastItem, filteredBatches.length)} of{" "}
                {filteredBatches.length} entries
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="btn-secondary py-1.5 px-3 text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="btn-secondary py-1.5 px-3 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default Inventory;
