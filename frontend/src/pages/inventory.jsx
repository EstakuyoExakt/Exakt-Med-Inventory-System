import { useMemo, useState } from "react";
import {
  Pill,
  Boxes,
  ArrowDown,
  CircleAlert,
  TriangleAlert,
  PackageOpen,
  Search,
  Plus,
  SlidersHorizontal,
  ArrowRightLeft,
  Eye,
} from "lucide-react";

// Components
import Card from "../components/card";
import Modal from "../components/modal";
import Snackbar from "../components/snackbar";

// Mock Data
import { medicines } from "../data/medicine";
import { batches as initialBatches } from "../data/batch";
import { facilities } from "../data/facility";
import { suppliers } from "../data/supplier";

function Inventory() {
  const currentDate = new Date("2026-08-19");
  const [batchesList, setBatchesList] = useState(() =>
    initialBatches.filter((b) => (b.quantity || 0) > 0),
  );

  // Total Medicines
  const totalMedicines = medicines.length;

  // Total Stock
  const totalStock = batchesList.reduce((sum, b) => sum + (b.quantity || 0), 0);

  // Map total quantity per medicine
  const medicineStockMap = useMemo(() => {
    const map = {};
    medicines.forEach((med) => {
      const medBatches = batchesList.filter(
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
  }, [batchesList]);

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
      batchesList.filter((batch) => {
        const exp = new Date(batch.expiryDate);
        const diffDays = Math.ceil((exp - currentDate) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 90;
      }).length,
    [batchesList],
  );

  // Expired (past expiry date)
  const expiredCount = useMemo(
    () =>
      batchesList.filter((batch) => new Date(batch.expiryDate) < currentDate)
        .length,
    [batchesList],
  );

  // Inventory List State
  const [modalState, setModalState] = useState(""); // "" | "receive" | "adjustment" | "transfer" | "view"
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStock, setFilterStock] = useState("");
  const [filterExpiry, setFilterExpiry] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [snackbar, setSnackbar] = useState("");

  // Receive Form State
  const initialReceiveForm = {
    medicine: "",
    supplier: "",
    expiryDate: "",
    quantity: "",
  };
  const [receiveForm, setReceiveForm] = useState(initialReceiveForm);

  const handleReceiveChange = (e) => {
    setReceiveForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleReceiveSubmit = (e) => {
    e.preventDefault();
    const qty = Number(receiveForm.quantity) || 0;

    // Auto-compute stock status based on quantity
    let stockStatus = "Normal";
    if (qty === 0) stockStatus = "Out of Stock";
    else if (qty <= 15) stockStatus = "Low Stock";

    // Auto-compute expiry status based on expiryDate
    let expiryStatus = "Good";
    const expDate = new Date(receiveForm.expiryDate);
    const diffDays = Math.ceil((expDate - currentDate) / (1000 * 60 * 60 * 24));
    if (expDate < currentDate) {
      expiryStatus = "Expired";
    } else if (diffDays >= 0 && diffDays <= 90) {
      expiryStatus = "Near Expiry";
    }

    const nextId =
      batchesList.length > 0
        ? Math.max(...batchesList.map((b) => b.id)) + 1
        : 1;

    const newBatch = {
      id: nextId,
      batchId: `BAT-${1000 + nextId}`,
      medicine: receiveForm.medicine,
      supplier: receiveForm.supplier,
      receivedAt: currentDate.toISOString().split("T")[0],
      expiryDate: receiveForm.expiryDate,
      quantity: qty,
      stock: stockStatus,
      status: expiryStatus,
    };

    setBatchesList((prev) => [newBatch, ...prev]);
    setReceiveForm(initialReceiveForm);
    setModalState("");
    setSnackbar("Stock received successfully!");
  };

  // View State Handler
  const handleOpenView = (batch) => {
    setSelectedBatch(batch);
    setModalState("view");
  };

  // Adjustment Form State
  const initialAdjustmentForm = {
    batchId: "",
    medicine: "",
    currentQuantity: 0,
    newQuantity: "",
    reason: "",
  };
  const [adjustmentForm, setAdjustmentForm] = useState(initialAdjustmentForm);

  const handleOpenAdjustment = (batch) => {
    setAdjustmentForm({
      batchId: batch.batchId,
      medicine: batch.medicine,
      currentQuantity: batch.quantity,
      newQuantity: batch.quantity,
      reason: "",
    });
    setModalState("adjustment");
  };

  // Transfer Form State
  const initialTransferForm = {
    batchId: "",
    medicine: "",
    currentQuantity: 0,
    quantity: "",
    facility: "",
  };
  const [transferForm, setTransferForm] = useState(initialTransferForm);

  const handleOpenTransfer = (batch) => {
    setTransferForm({
      batchId: batch.batchId,
      medicine: batch.medicine,
      currentQuantity: batch.quantity,
      quantity: "",
      facility: "",
    });
    setModalState("transfer");
  };

  const handleTransferChange = (e) => {
    const { name, value } = e.target;
    setTransferForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    const qtyToTransfer = Number(transferForm.quantity) || 0;
    if (qtyToTransfer <= 0 || qtyToTransfer > transferForm.currentQuantity) {
      return;
    }

    const remainingQty = transferForm.currentQuantity - qtyToTransfer;

    if (remainingQty <= 0) {
      setBatchesList((prev) =>
        prev.filter((b) => b.batchId !== transferForm.batchId),
      );
    } else {
      const stockStatus = remainingQty <= 15 ? "Low Stock" : "Normal";
      setBatchesList((prev) =>
        prev.map((b) =>
          b.batchId === transferForm.batchId
            ? {
                ...b,
                quantity: remainingQty,
                stock: stockStatus,
              }
            : b,
        ),
      );
    }

    setTransferForm(initialTransferForm);
    setModalState("");
    setSnackbar(`Transferred ${qtyToTransfer} units to ${transferForm.facility} successfully!`);
  };

  const handleAdjustmentChange = (e) => {
    const { name, value } = e.target;
    setAdjustmentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdjustmentSubmit = (e) => {
    e.preventDefault();
    const qty = Number(adjustmentForm.newQuantity) || 0;

    if (qty <= 0) {
      setBatchesList((prev) =>
        prev.filter((b) => b.batchId !== adjustmentForm.batchId),
      );
    } else {
      const stockStatus = qty <= 15 ? "Low Stock" : "Normal";
      setBatchesList((prev) =>
        prev.map((b) =>
          b.batchId === adjustmentForm.batchId
            ? {
                ...b,
                quantity: qty,
                stock: stockStatus,
              }
            : b,
        ),
      );
    }

    setAdjustmentForm(initialAdjustmentForm);
    setModalState("");
    setSnackbar("Stock adjusted successfully!");
  };

  const filteredBatches = useMemo(() => {
    const q = search.toLowerCase();
    return batchesList.filter((batch) => {
      const matchesSearch =
        batch.medicine.toLowerCase().includes(q) ||
        batch.batchId.toLowerCase().includes(q) ||
        batch.expiryDate.includes(q) ||
        (batch.status && batch.status.toLowerCase().includes(q)) ||
        (batch.stock && batch.stock.toLowerCase().includes(q)) ||
        String(batch.quantity).includes(q);
      const matchesStock = filterStock === "" || batch.stock === filterStock;
      const matchesExpiry =
        filterExpiry === "" || batch.status === filterExpiry;
      return matchesSearch && matchesStock && matchesExpiry;
    });
  }, [batchesList, search, filterStock, filterExpiry]);

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
            <button
              className="btn-primary"
              onClick={() => setModalState("receive")}
            >
              <Plus className="w-4 h-4" />
              Receive Stock
            </button>
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
              value={filterStock}
              onChange={(e) => {
                setFilterStock(e.target.value);
                setCurrentPage(1);
              }}
              className="input w-full sm:w-44"
            >
              <option value="">All Stock</option>
              <option value="Normal">Normal</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
            <select
              value={filterExpiry}
              onChange={(e) => {
                setFilterExpiry(e.target.value);
                setCurrentPage(1);
              }}
              className="input w-full sm:w-44"
            >
              <option value="">All Expiry Status</option>
              <option value="Good">Good</option>
              <option value="Near Expiry">Near Expiry</option>
              <option value="Expired">Expired</option>
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
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-center">Actions</th>
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
                  <td className="p-2 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        batch.status === "Near Expiry"
                          ? "bg-amber-100 text-amber-700"
                          : batch.status === "Expired"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {batch.status}
                    </span>
                  </td>
                  <td className="p-2 text-sm flex justify-center gap-2">
                    <button
                      className="cursor-pointer p-2 text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                      title="View Details"
                      onClick={() => handleOpenView(batch)}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="cursor-pointer p-2 text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors"
                      title="Stock Adjustment"
                      onClick={() => handleOpenAdjustment(batch)}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      className="cursor-pointer p-2 text-teal-600 bg-teal-100 rounded-md hover:bg-teal-200 transition-colors"
                      title="Transfer Stock"
                      onClick={() => handleOpenTransfer(batch)}
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {currentBatches.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-4 text-center text-gray-500">
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

      {/* Receive Stock Modal */}
      <Modal
        isOpen={modalState === "receive"}
        onClose={() => {
          setModalState("");
          setReceiveForm(initialReceiveForm);
        }}
        title="Receive Stock"
      >
        <form onSubmit={handleReceiveSubmit} className="grid gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Medicine
            </label>
            <select
              name="medicine"
              value={receiveForm.medicine}
              onChange={handleReceiveChange}
              required
              className="input"
            >
              <option value="">Select Medicine</option>
              {medicines.map((med) => (
                <option
                  key={med.id}
                  value={`${med.genericName} (${med.brandName})`}
                >
                  {med.genericName} ({med.brandName}) - {med.strength}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Supplier
            </label>
            <select
              name="supplier"
              value={receiveForm.supplier}
              onChange={handleReceiveChange}
              required
              className="input"
            >
              <option value="">Select Supplier</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.name}>
                  {sup.name} ({sup.supplierCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={receiveForm.quantity}
                onChange={handleReceiveChange}
                placeholder="e.g. 100"
                min="1"
                required
                className="input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Expiry Date
              </label>
              <input
                type="date"
                name="expiryDate"
                value={receiveForm.expiryDate}
                onChange={handleReceiveChange}
                required
                className="input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setModalState("");
                setReceiveForm(initialReceiveForm);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Receive Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={modalState === "adjustment"}
        onClose={() => {
          setModalState("");
          setAdjustmentForm(initialAdjustmentForm);
        }}
        title="Stock Adjustment"
      >
        <form onSubmit={handleAdjustmentSubmit} className="grid gap-4">
          {/* Batch Information Display */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Batch ID
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {adjustmentForm.batchId}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {adjustmentForm.medicine}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Current Qty
              </p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                {adjustmentForm.currentQuantity} units
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              New Quantity
            </label>
            <input
              type="number"
              name="newQuantity"
              value={adjustmentForm.newQuantity}
              onChange={handleAdjustmentChange}
              placeholder="e.g. 50"
              min="0"
              required
              className="input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Reason
            </label>
            <input
              type="text"
              name="reason"
              value={adjustmentForm.reason}
              onChange={handleAdjustmentChange}
              placeholder="e.g. Damaged stock, Inventory count discrepancy, Audit adjustment"
              required
              className="input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setModalState("");
                setAdjustmentForm(initialAdjustmentForm);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Adjust Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Transfer Stock Modal */}
      <Modal
        isOpen={modalState === "transfer"}
        onClose={() => {
          setModalState("");
          setTransferForm(initialTransferForm);
        }}
        title="Transfer Stock"
      >
        <form onSubmit={handleTransferSubmit} className="grid gap-4">
          {/* Batch Information Display */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Batch ID
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {transferForm.batchId}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {transferForm.medicine}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Available Qty
              </p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                {transferForm.currentQuantity} units
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Destination Facility
            </label>
            <select
              name="facility"
              value={transferForm.facility}
              onChange={handleTransferChange}
              required
              className="input"
            >
              <option value="">Select Destination Facility</option>
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.name}>
                  {fac.name} ({fac.type})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Transfer Quantity
            </label>
            <input
              type="number"
              name="quantity"
              value={transferForm.quantity}
              onChange={handleTransferChange}
              placeholder={`Max: ${transferForm.currentQuantity}`}
              min="1"
              max={transferForm.currentQuantity}
              required
              className="input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setModalState("");
                setTransferForm(initialTransferForm);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={transferForm.currentQuantity === 0}
              className="btn-primary"
            >
              Transfer Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* View Batch Details Modal */}
      <Modal
        isOpen={modalState === "view"}
        onClose={() => {
          setModalState("");
          setSelectedBatch(null);
        }}
        title="Batch Details"
      >
        {selectedBatch && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Batch ID
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedBatch.batchId}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Stock / Expiry
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedBatch.stock === "Low Stock"
                        ? "bg-amber-100 text-amber-700"
                        : selectedBatch.stock === "Out of Stock"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {selectedBatch.stock}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedBatch.status === "Near Expiry"
                        ? "bg-amber-100 text-amber-700"
                        : selectedBatch.status === "Expired"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {selectedBatch.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 max-w-sm mx-auto w-full">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Medicine
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedBatch.medicine}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Quantity
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedBatch.quantity} units
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Supplier
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedBatch.supplier || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Received Date
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedBatch.receivedAt || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Expiry Date
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedBatch.expiryDate}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setModalState("");
                  setSelectedBatch(null);
                }}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Snackbar Notification */}
      {snackbar && (
        <Snackbar
          description={snackbar}
          onClose={() => setSnackbar("")}
        />
      )}
    </div>
  );
}

export default Inventory;
