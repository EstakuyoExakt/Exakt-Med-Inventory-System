import { useMemo, useState } from "react";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Eye,
  CreditCard,
} from "lucide-react";

// Components
import Card from "../components/card";
import ListCard from "../components/listCard";
import Table from "../components/table";
import SearchBar from "../components/searchBar";
import Modal from "../components/modal";
import Snackbar from "../components/snackbar";

// Mock Data
import { invoices as initialInvoices } from "../data/accounting";
import { suppliers } from "../data/supplier";
import { medicines } from "../data/medicine";

// External Form Component to prevent focus loss on re-render
function InvoiceFormFields({ formData, handleFormChange }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Invoice Number
          </label>
          <input
            name="invoiceNumber"
            value={formData.invoiceNumber}
            onChange={handleFormChange}
            placeholder="e.g. INV-2026-013"
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">PO Number</label>
          <input
            name="poNumber"
            value={formData.poNumber}
            onChange={handleFormChange}
            placeholder="e.g. PO-8822"
            required
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Supplier</label>
          <select
            name="supplier"
            value={formData.supplier}
            onChange={handleFormChange}
            required
            className="input"
          >
            <option value="">Select Supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Medicine</label>
          <select
            name="medicine"
            value={formData.medicine}
            onChange={handleFormChange}
            required
            className="input"
          >
            <option value="">Select Medicine</option>
            {medicines.map((m) => (
              <option
                key={m.id}
                value={`${m.genericName} (${m.brandName} ${m.strength || ""})`}
              >
                {m.genericName} ({m.brandName})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Quantity</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleFormChange}
            placeholder="e.g. 100"
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Unit Price (₱)
          </label>
          <input
            type="number"
            step="0.01"
            name="unitPrice"
            value={formData.unitPrice}
            onChange={handleFormChange}
            placeholder="e.g. 15.50"
            required
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Issue Date
          </label>
          <input
            type="date"
            name="issueDate"
            value={formData.issueDate}
            onChange={handleFormChange}
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Due Date</label>
          <input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleFormChange}
            required
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Payment Terms
          </label>
          <select
            name="paymentTerms"
            value={formData.paymentTerms}
            onChange={handleFormChange}
            className="input"
          >
            <option value="COD">COD</option>
            <option value="Net 15">Net 15</option>
            <option value="Net 30">Net 30</option>
            <option value="Net 45">Net 45</option>
            <option value="Net 60">Net 60</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Payment Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleFormChange}
            className="input"
          >
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>
    </>
  );
}

function Accounting() {
  const [invoicesList, setInvoicesList] = useState(initialInvoices);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalState, setModalState] = useState(""); // "" | "create" | "view" | "pay"
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [snackbar, setSnackbar] = useState("");

  const itemsPerPage = 6;

  // Form State
  const initialForm = {
    invoiceNumber: "",
    poNumber: "",
    batchReference: "BAT-AUTO",
    supplier: "",
    medicine: "",
    quantity: "",
    unitPrice: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    paymentTerms: "Net 30",
    status: "Pending",
    paymentMethod: "Bank Transfer",
  };
  const [formData, setFormData] = useState(initialForm);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCloseModal = () => {
    setModalState("");
    setSelectedInvoice(null);
    setFormData(initialForm);
  };

  // Financial Metrics
  const totalValuation = useMemo(
    () => invoicesList.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0),
    [invoicesList],
  );

  const accountsPayable = useMemo(
    () =>
      invoicesList
        .filter((inv) => inv.status === "Pending" || inv.status === "Overdue")
        .reduce((acc, curr) => acc + (curr.totalAmount || 0), 0),
    [invoicesList],
  );

  const totalPaid = useMemo(
    () =>
      invoicesList
        .filter((inv) => inv.status === "Paid")
        .reduce((acc, curr) => acc + (curr.totalAmount || 0), 0),
    [invoicesList],
  );

  const overdueBalance = useMemo(
    () =>
      invoicesList
        .filter((inv) => inv.status === "Overdue")
        .reduce((acc, curr) => acc + (curr.totalAmount || 0), 0),
    [invoicesList],
  );

  // Actions
  const handleOpenView = (inv) => {
    setSelectedInvoice(inv);
    setModalState("view");
  };

  const handleOpenPay = (inv) => {
    setSelectedInvoice(inv);
    setModalState("pay");
  };

  const handleConfirmPayment = () => {
    setInvoicesList((prev) =>
      prev.map((inv) =>
        inv.id === selectedInvoice.id
          ? {
              ...inv,
              status: "Paid",
              paidDate: new Date().toISOString().split("T")[0],
            }
          : inv,
      ),
    );
    handleCloseModal();
    setSnackbar("Payment recorded successfully!");
  };

  const handleOpenCreate = () => {
    const nextInv = `INV-2026-${String(invoicesList.length + 1).padStart(3, "0")}`;
    const nextPo = `PO-${8810 + invoicesList.length}`;
    setFormData({
      ...initialForm,
      invoiceNumber: nextInv,
      poNumber: nextPo,
    });
    setModalState("create");
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const qty = Number(formData.quantity) || 1;
    const price = Number(formData.unitPrice) || 0;
    const total = qty * price;
    const nextId =
      invoicesList.length > 0
        ? Math.max(...invoicesList.map((i) => i.id)) + 1
        : 1;

    const newInvoice = {
      id: nextId,
      ...formData,
      quantity: qty,
      unitPrice: price,
      totalAmount: total,
      paidDate: formData.status === "Paid" ? formData.issueDate : null,
    };

    setInvoicesList((prev) => [newInvoice, ...prev]);
    handleCloseModal();
    setSnackbar("Invoice recorded successfully!");
  };

  // Filtered List
  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase();
    return invoicesList.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.poNumber.toLowerCase().includes(q) ||
        inv.supplier.toLowerCase().includes(q) ||
        inv.medicine.toLowerCase().includes(q) ||
        inv.status.toLowerCase().includes(q);

      const matchesStatus =
        filterStatus === "" ||
        inv.status.toLowerCase() === filterStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [invoicesList, search, filterStatus]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = filteredInvoices.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  const formatCurrency = (amount) => {
    return `₱${Number(amount || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="w-full p-10 max-w-7xl mx-auto overflow-y-auto max-h-full flex flex-col gap-5">
      {/* 4 Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-slide-up">
        <Card
          title={"Total Purchases"}
          action={
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <DollarSign className="w-5 h-5" />
            </div>
          }
        >
          <span className="text-2xl font-bold text-slate-900">
            {formatCurrency(totalValuation)}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            Total recorded purchases
          </p>
        </Card>

        <Card
          title={"Accounts Payable"}
          action={
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          }
        >
          <span className="text-2xl font-bold text-amber-600">
            {formatCurrency(accountsPayable)}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            Pending & unpaid invoices
          </p>
        </Card>

        <Card
          title={"Total Paid"}
          action={
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          }
        >
          <span className="text-2xl font-bold text-emerald-600">
            {formatCurrency(totalPaid)}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            Settled supplier receipts
          </p>
        </Card>

        <Card
          title={"Overdue Balance"}
          action={
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          }
        >
          <span className="text-2xl font-bold text-rose-600">
            {formatCurrency(overdueBalance)}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            Invoices past payment terms
          </p>
        </Card>
      </div>

      {/* Invoice List Card */}
      <ListCard
        title={"Supplier Invoices & Ledger"}
        action={
          <button className="btn-primary" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" />
            Record Invoice
          </button>
        }
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredInvoices.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      >
        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchBar
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by invoice #, PO #, supplier, or medicine..."
          />
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="input w-full sm:w-48"
          >
            <option value="">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        {/* Invoices Table */}
        <Table
          headers={[
            "Invoice No.",
            "Supplier",
            "Medicine",
            "Due Date",
            "Amount",
            "Status",
            "Actions",
          ]}
          isEmpty={currentInvoices.length === 0}
          emptyMessage="No invoices found."
        >
          {currentInvoices.map((inv, index) => (
            <tr
              key={inv.id}
              className="hover:bg-gray-50 transition-colors animate-slide-up-1 h-12"
              style={{
                animationDelay: `${index * 0.05}s`,
                animationFillMode: "both",
              }}
            >
              <td className="p-2 text-sm font-medium text-slate-900">
                {inv.invoiceNumber}
              </td>
              <td className="p-2 text-sm text-slate-700 font-medium">
                {inv.supplier}
              </td>
              <td className="p-2 text-sm text-slate-600 truncate max-w-50">
                {inv.medicine}
              </td>
              <td className="p-2 text-sm text-slate-500 whitespace-nowrap">
                {inv.dueDate}
              </td>
              <td className="p-2 text-sm font-semibold text-slate-900">
                {formatCurrency(inv.totalAmount)}
              </td>
              <td className="p-2 text-sm">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    inv.status === "Paid"
                      ? "bg-emerald-100 text-emerald-700"
                      : inv.status === "Pending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {inv.status}
                </span>
              </td>
              <td className="p-2 text-sm flex justify-center gap-2">
                <button
                  className="cursor-pointer p-2 text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                  title="View Details"
                  onClick={() => handleOpenView(inv)}
                >
                  <Eye className="w-4 h-4" />
                </button>
                {inv.status !== "Paid" && (
                  <button
                    className="cursor-pointer p-2 text-emerald-600 bg-emerald-100 rounded-md hover:bg-emerald-200 transition-colors"
                    title="Mark as Paid"
                    onClick={() => handleOpenPay(inv)}
                  >
                    <CreditCard className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </ListCard>

      {/* View Invoice Details Modal */}
      <Modal
        isOpen={modalState === "view"}
        onClose={handleCloseModal}
        title="Invoice Details"
      >
        {selectedInvoice && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Invoice Number
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedInvoice.invoiceNumber}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Payment Status
                </p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-medium ${
                    selectedInvoice.status === "Paid"
                      ? "bg-emerald-100 text-emerald-700"
                      : selectedInvoice.status === "Pending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {selectedInvoice.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 max-w-lg mx-auto w-full">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">Supplier</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedInvoice.supplier}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">PO Number</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedInvoice.poNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Medicine</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedInvoice.medicine}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Quantity Received
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedInvoice.quantity} units
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Unit Price
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {formatCurrency(selectedInvoice.unitPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Total Amount
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {formatCurrency(selectedInvoice.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Payment Terms
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedInvoice.paymentTerms}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Due Date</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedInvoice.dueDate}
                  </p>
                </div>
              </div>
            </div>

            {selectedInvoice.paidDate && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex justify-between items-center text-sm text-emerald-800">
                <span>Payment settled on:</span>
                <span className="font-semibold">
                  {selectedInvoice.paidDate}
                </span>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Record Payment Confirmation Modal */}
      <Modal
        isOpen={modalState === "pay"}
        onClose={handleCloseModal}
        title="Record Supplier Payment"
      >
        <div className="grid gap-4">
          <p className="text-sm text-gray-600">
            Confirm recording full payment of{" "}
            <span className="font-bold text-slate-900">
              {formatCurrency(selectedInvoice?.totalAmount)}
            </span>{" "}
            for invoice{" "}
            <span className="font-semibold text-slate-900">
              {selectedInvoice?.invoiceNumber}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900">
              {selectedInvoice?.supplier}
            </span>
            ?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmPayment}
              className="btn-primary"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Payment
            </button>
          </div>
        </div>
      </Modal>

      {/* Record New Invoice Modal */}
      <Modal
        isOpen={modalState === "create"}
        onClose={handleCloseModal}
        title="Record Supplier Invoice"
      >
        <form onSubmit={handleCreateSubmit} className="grid gap-4">
          <InvoiceFormFields
            formData={formData}
            handleFormChange={handleFormChange}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Plus className="w-4 h-4" />
              Save Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* Feedback Snackbar */}
      {snackbar && (
        <Snackbar description={snackbar} onClose={() => setSnackbar("")} />
      )}
    </div>
  );
}

export default Accounting;
