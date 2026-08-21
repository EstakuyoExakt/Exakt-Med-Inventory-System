import { useMemo, useState } from "react";
import {
  Truck,
  Building2,
  Building,
  Plus,
  Search,
  PencilIcon,
  TrashIcon,
  Eye,
} from "lucide-react";

// Components
import Card from "../../components/card";
import ListCard from "../../components/listCard";
import Table from "../../components/table";
import SearchBar from "../../components/searchBar";
import Modal from "../../components/modal";
import Snackbar from "../../components/snackbar";

// Mock Data
import { suppliers as initialSuppliers } from "../../data/supplier";

// Form Fields Component defined outside to prevent focus loss on typing
function SupplierFormFields({ formData, handleFormChange }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Supplier Code
          </label>
          <input
            name="supplierCode"
            value={formData.supplierCode}
            onChange={handleFormChange}
            placeholder="e.g. SUP-001"
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Company Name
          </label>
          <input
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            placeholder="e.g. Unilab Pharmaceuticals Inc."
            required
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Contact Person
          </label>
          <input
            name="contactPerson"
            value={formData.contactPerson}
            onChange={handleFormChange}
            placeholder="e.g. Carlos Mendoza"
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleFormChange}
            placeholder="e.g. contact@supplier.com"
            required
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Contact Number
          </label>
          <input
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleFormChange}
            placeholder="e.g. +63 917 111 2233"
            required
            className="input"
          />
        </div>
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Address</label>
          <input
            name="address"
            value={formData.address}
            onChange={handleFormChange}
            placeholder="e.g. 66 United Street, Mandaluyong City"
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleFormChange}
            className="input"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>
    </>
  );
}

function SupplierManagement() {
  const [suppliersList, setSuppliersList] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalState, setModalState] = useState(""); // "" | "create" | "edit" | "delete" | "view"
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [snackbar, setSnackbar] = useState("");

  const itemsPerPage = 6;

  // Counts
  const totalSuppliers = suppliersList.length;
  const activeCount = useMemo(
    () => suppliersList.filter((s) => s.status === "Active").length,
    [suppliersList],
  );
  const inactiveCount = useMemo(
    () => suppliersList.filter((s) => s.status === "Inactive").length,
    [suppliersList],
  );

  // Form State
  const initialForm = {
    supplierCode: "",
    name: "",
    contactPerson: "",
    email: "",
    contactNumber: "",
    address: "",
    paymentTerms: "Net 30",
    status: "Active",
  };
  const [formData, setFormData] = useState(initialForm);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCloseModal = () => {
    setModalState("");
    setSelectedSupplier(null);
    setFormData(initialForm);
  };

  // View
  const handleOpenView = (sup) => {
    setSelectedSupplier(sup);
    setModalState("view");
  };

  // Create
  const handleOpenCreate = () => {
    const nextCode = `SUP-${String(suppliersList.length + 1).padStart(3, "0")}`;
    setFormData({
      ...initialForm,
      supplierCode: nextCode,
    });
    setModalState("create");
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const nextId =
      suppliersList.length > 0
        ? Math.max(...suppliersList.map((s) => s.id)) + 1
        : 1;

    const newSupplier = {
      id: nextId,
      ...formData,
    };

    setSuppliersList((prev) => [newSupplier, ...prev]);
    handleCloseModal();
    setSnackbar("Supplier added successfully!");
  };

  // Edit
  const handleOpenEdit = (sup) => {
    setSelectedSupplier(sup);
    setFormData({
      supplierCode: sup.supplierCode || "",
      name: sup.name || "",
      contactPerson: sup.contactPerson || "",
      email: sup.email || "",
      contactNumber: sup.contactNumber || "",
      address: sup.address || "",
      paymentTerms: sup.paymentTerms || "Net 30",
      status: sup.status || "Active",
    });
    setModalState("edit");
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setSuppliersList((prev) =>
      prev.map((s) =>
        s.id === selectedSupplier.id
          ? {
              ...s,
              ...formData,
            }
          : s,
      ),
    );
    handleCloseModal();
    setSnackbar("Supplier updated successfully!");
  };

  // Delete
  const handleOpenDelete = (sup) => {
    setSelectedSupplier(sup);
    setModalState("delete");
  };

  const handleDeleteConfirm = () => {
    setSuppliersList((prev) =>
      prev.filter((s) => s.id !== selectedSupplier.id),
    );
    handleCloseModal();
    setSnackbar("Supplier deleted successfully!");
  };

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    const q = search.toLowerCase();
    return suppliersList.filter((s) => {
      const matchesSearch =
        s.supplierCode.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.contactNumber.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.paymentTerms.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q);

      const matchesStatus =
        filterStatus === "" ||
        s.status.toLowerCase() === filterStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [suppliersList, search, filterStatus]);

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSuppliers = filteredSuppliers.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );



  return (
    <div className="w-full p-10 max-w-7xl mx-auto overflow-y-auto max-h-full flex flex-col gap-5">
      {/* Total Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-slide-up">
        <Card
          title={"Total Suppliers"}
          action={
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
          }
        >
          <span className="text-3xl font-bold text-slate-900">
            {totalSuppliers}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            Registered medical suppliers
          </p>
        </Card>
        <Card
          title={"Total Active"}
          action={
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Building2 className="w-5 h-5" />
            </div>
          }
        >
          <span className="text-3xl font-bold text-emerald-600">
            {activeCount}
          </span>
          <p className="text-xs text-slate-500 mt-1">Active supply partners</p>
        </Card>
        <Card
          title={"Total Inactive"}
          action={
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
              <Building className="w-5 h-5" />
            </div>
          }
        >
          <span className="text-3xl font-bold text-rose-600">
            {inactiveCount}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            Inactive / suspended partners
          </p>
        </Card>
      </div>

      {/* Supplier List Card */}
      <ListCard
        title={"Supplier List"}
        action={
          <button className="btn-primary" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        }
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredSuppliers.length}
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
            placeholder="Search by code, company, contact person, email, or address..."
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
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Supplier Table */}
        <Table
          headers={[
            "Supplier Code",
            "Company Name",
            "Contact Person",
            "Payment Terms",
            "Status",
            "Actions",
          ]}
          isEmpty={currentSuppliers.length === 0}
          emptyMessage="No suppliers found."
        >
          {currentSuppliers.map((sup, index) => (
            <tr
              key={sup.id}
              className="hover:bg-gray-50 transition-colors animate-slide-up-1 h-12"
              style={{
                animationDelay: `${index * 0.05}s`,
                animationFillMode: "both",
              }}
            >
              <td className="p-2 text-sm font-medium text-slate-700">
                {sup.supplierCode}
              </td>
              <td className="p-2 text-sm font-medium text-slate-900">
                {sup.name}
              </td>
              <td className="p-2 text-sm text-slate-700">
                {sup.contactPerson}
              </td>
              <td className="p-2 text-sm text-slate-600">{sup.paymentTerms}</td>
              <td className="p-2 text-sm">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    sup.status === "Active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {sup.status}
                </span>
              </td>
              <td className="p-2 text-sm flex justify-center gap-2">
                <button
                  className="cursor-pointer p-2 text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                  title="View Details"
                  onClick={() => handleOpenView(sup)}
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  className="cursor-pointer p-2 text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                  title="Edit"
                  onClick={() => handleOpenEdit(sup)}
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenDelete(sup)}
                  className="cursor-pointer p-2 text-red-600 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                  title="Delete"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </ListCard>

      {/* View Supplier Modal */}
      <Modal
        isOpen={modalState === "view"}
        onClose={handleCloseModal}
        title="Supplier Details"
      >
        {selectedSupplier && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Supplier Code
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedSupplier.supplierCode}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-medium ${
                    selectedSupplier.status === "Active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {selectedSupplier.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 max-w-md mx-auto w-full">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Company Name
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedSupplier.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Contact Person
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedSupplier.contactPerson}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Payment Terms
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedSupplier.paymentTerms}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedSupplier.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Contact Number
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedSupplier.contactNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Address</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedSupplier.address}
                  </p>
                </div>
              </div>
            </div>

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

      {/* Add Supplier Modal */}
      <Modal
        isOpen={modalState === "create"}
        onClose={handleCloseModal}
        title="Add Supplier"
      >
        <form onSubmit={handleCreateSubmit} className="grid gap-4">
          <SupplierFormFields
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
              Add Supplier
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Supplier Modal */}
      <Modal
        isOpen={modalState === "edit"}
        onClose={handleCloseModal}
        title="Edit Supplier"
      >
        <form onSubmit={handleEditSubmit} className="grid gap-4">
          <SupplierFormFields
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
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Supplier Modal */}
      <Modal
        isOpen={modalState === "delete"}
        onClose={handleCloseModal}
        title="Delete Supplier"
      >
        <div className="grid gap-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete supplier{" "}
            <span className="font-semibold text-slate-900">
              {selectedSupplier?.name} ({selectedSupplier?.supplierCode})
            </span>
            ? This action cannot be undone.
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
              onClick={handleDeleteConfirm}
              className="btn-danger"
            >
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Feedback Snackbar */}
      {snackbar && (
        <Snackbar description={snackbar} onClose={() => setSnackbar("")} />
      )}
    </div>
  );
}

export default SupplierManagement;
