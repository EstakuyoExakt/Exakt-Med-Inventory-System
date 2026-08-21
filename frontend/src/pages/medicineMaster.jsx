import { useMemo, useState } from "react";
import {
  PencilIcon,
  TrashIcon,
  Plus,
  Search,
  Eye,
  ArrowDown,
  PackageOpen,
} from "lucide-react";
import { medicines as initialMedicines } from "../data/medicine";

// Components
import Card from "../components/card";
import Modal from "../components/modal";
import Snackbar from "../components/snackbar";

function MedicineMaster() {
  const [medicines, setMedicines] = useState(initialMedicines);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalState, setModalState] = useState(""); // "" | "create" | "edit" | "delete"
  const [selectedMed, setSelectedMed] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [snackbar, setSnackbar] = useState("");

  const emptyForm = {
    medCode: "",
    genericName: "",
    brandName: "",
    dosageType: "",
    strength: "",
    reorderLevel: "",
    status: "Out of Stock",
  };
  const [formData, setFormData] = useState(emptyForm);

  const handleFormChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCloseModal = () => {
    setModalState("");
    setSelectedMed(null);
    setFormData(emptyForm);
  };

  // View
  const handleOpenView = (med) => {
    setSelectedMed(med);
    setModalState("view");
  };

  // Create
  const handleOpenCreate = () => {
    setFormData(emptyForm);
    setModalState("create");
  };

  const handleAddMedicine = (e) => {
    e.preventDefault();
    const newMed = {
      id:
        medicines.length > 0 ? Math.max(...medicines.map((m) => m.id)) + 1 : 1,
      ...formData,
      reorderLevel: Number(formData.reorderLevel) || 0,
    };
    setMedicines((prev) => [...prev, newMed]);
    handleCloseModal();
    setSnackbar("Medicine added successfully!");
  };

  // Edit
  const handleOpenEdit = (med) => {
    setSelectedMed(med);
    setFormData({
      medCode: med.medCode,
      genericName: med.genericName,
      brandName: med.brandName,
      dosageType: med.dosageType ?? "",
      strength: med.strength ?? "",
      reorderLevel: med.reorderLevel ?? "",
      status: med.status || "Over Stock",
    });
    setModalState("edit");
  };

  const handleEditMedicine = (e) => {
    e.preventDefault();
    setMedicines((prev) =>
      prev.map((m) =>
        m.id === selectedMed.id
          ? {
              ...m,
              ...formData,
              reorderLevel: Number(formData.reorderLevel) || 0,
            }
          : m,
      ),
    );
    handleCloseModal();
    setSnackbar("Medicine updated successfully!");
  };

  // Delete
  const handleOpenDelete = (med) => {
    setSelectedMed(med);
    setModalState("delete");
  };

  const handleConfirmDelete = () => {
    setMedicines((prev) => prev.filter((m) => m.id !== selectedMed.id));
    handleCloseModal();
    setSnackbar("Medicine deleted successfully!");
  };

  const statuses = ["Low Stock", "Over Stock", "Out of Stock"];

  const lowStockCount = useMemo(
    () => medicines.filter((m) => m.status === "Low Stock").length,
    [medicines],
  );

  const outOfStockCount = useMemo(
    () => medicines.filter((m) => m.status === "Out of Stock").length,
    [medicines],
  );

  const filteredMedicines = medicines.filter((med) => {
    const q = search.toLowerCase();
    const matchesSearch =
      med.medCode.toLowerCase().includes(q) ||
      med.genericName.toLowerCase().includes(q) ||
      med.brandName.toLowerCase().includes(q) ||
      (med.status && med.status.toLowerCase().includes(q)) ||
      (med.reorderLevel && String(med.reorderLevel).includes(q));
    const matchesStatus = filterStatus === "" || med.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const itemsPerPage = 6;
  const totalPages = Math.ceil(filteredMedicines.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMedicines = filteredMedicines.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  // Shared form fields for create/edit
  const MedicineFormFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Med Code</label>
          <input
            name="medCode"
            value={formData.medCode}
            onChange={handleFormChange}
            placeholder="e.g. MED-013"
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Reorder Level
          </label>
          <input
            type="number"
            name="reorderLevel"
            value={formData.reorderLevel}
            onChange={handleFormChange}
            placeholder="e.g. 50"
            required
            className="input"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Generic Name
        </label>
        <input
          name="genericName"
          value={formData.genericName}
          onChange={handleFormChange}
          placeholder="e.g. Paracetamol"
          required
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Brand Name</label>
        <input
          name="brandName"
          value={formData.brandName}
          onChange={handleFormChange}
          placeholder="e.g. Biogesic"
          required
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Dosage Type
          </label>
          <input
            name="dosageType"
            value={formData.dosageType}
            onChange={handleFormChange}
            placeholder="e.g. Tablet, Capsule"
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Strength</label>
          <input
            name="strength"
            value={formData.strength}
            onChange={handleFormChange}
            placeholder="e.g. 500mg"
            required
            className="input"
          />
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="p-10 w-full max-w-7xl mx-auto overflow-y-auto max-h-full flex flex-col gap-5">
        {/* Total Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-slide-up">
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
        </div>

        {/* Medicine List table */}
        <Card
          className="animate-slide-up-3 min-h-145 flex flex-col justify-between"
          title={"Medicine List"}
          action={
            <button className="btn-primary" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4" />
              Add Medicine
            </button>
          }
        >
          <div className="mt-5 flex-1 flex flex-col justify-between">
            <div>
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
                    placeholder="Search by code, name, status, or reorder level..."
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
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b bg-gray-50 text-gray-600 text-sm">
                    <th className="p-3 font-medium">Med Code</th>
                    <th className="p-3 font-medium">Generic Name</th>
                    <th className="p-3 font-medium">Brand Name</th>
                    <th className="p-3 font-medium">Reorder Level</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody key={currentPage}>
                  {currentMedicines.map((med, index) => (
                    <tr
                      key={med.id}
                      className="hover:bg-gray-50 transition-colors animate-slide-up h-12"
                      style={{
                        animationDelay: `${index * 0.05}s`,
                        animationFillMode: "both",
                      }}
                    >
                      <td className="p-2 text-sm">{med.medCode}</td>
                      <td className="p-2 text-sm">{med.genericName}</td>
                      <td className="p-2 text-sm">{med.brandName}</td>
                      <td className="p-2 text-sm">{med.reorderLevel}</td>
                      <td className="p-2 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            med.status === "Low Stock"
                              ? "bg-amber-100 text-amber-700"
                              : med.status === "Out of Stock"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {med.status}
                        </span>
                      </td>
                      <td className="p-2 text-sm flex justify-center gap-2">
                        <button
                          className="cursor-pointer p-2 text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                          title="View Details"
                          onClick={() => handleOpenView(med)}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="cursor-pointer p-2 text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                          title="Edit"
                          onClick={() => handleOpenEdit(med)}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(med)}
                          className="cursor-pointer p-2 text-red-600 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {currentMedicines.length === 0 && (
                    <tr className="h-64">
                      <td
                        colSpan="6"
                        className="p-8 text-center text-gray-500 align-middle"
                      >
                        No medicines found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredMedicines.length > itemsPerPage && (
              <div className="flex justify-between items-center pt-4 pr-5 pl-5 mt-auto">
                <span className="text-sm text-gray-500">
                  Showing {indexOfFirstItem + 1} to{" "}
                  {Math.min(indexOfLastItem, filteredMedicines.length)} of{" "}
                  {filteredMedicines.length} entries
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
          </div>
        </Card>
      </div>

      {/* Add Medicine Modal */}
      <Modal
        isOpen={modalState === "create"}
        onClose={handleCloseModal}
        title="Add Medicine"
      >
        <form onSubmit={handleAddMedicine} className="grid gap-4">
          <MedicineFormFields />
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
              Add Medicine
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Medicine Modal */}
      <Modal
        isOpen={modalState === "edit"}
        onClose={handleCloseModal}
        title="Edit Medicine"
      >
        <form onSubmit={handleEditMedicine} className="grid gap-4">
          <MedicineFormFields />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <PencilIcon className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modalState === "delete"}
        onClose={handleCloseModal}
        title="Delete Medicine"
        size="sm"
      >
        <div className="grid gap-5">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900">
              {selectedMed?.genericName} ({selectedMed?.brandName})
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={handleCloseModal} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="btn inline-flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-2 focus:ring-red-500/40 rounded-lg px-4 py-2.5 text-sm font-medium transition duration-200 ease-in-out cursor-pointer"
            >
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* View Medicine Details Modal */}
      <Modal
        isOpen={modalState === "view"}
        onClose={handleCloseModal}
        title="Medicine Details"
      >
        {selectedMed && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Med Code
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedMed.medCode}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-medium ${
                    selectedMed.status === "Low Stock"
                      ? "bg-amber-100 text-amber-700"
                      : selectedMed.status === "Out of Stock"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {selectedMed.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 max-w-sm mx-auto w-full">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Generic Name
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedMed.genericName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Brand Name
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedMed.brandName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Reorder Level
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedMed.reorderLevel} units
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Dosage Type
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedMed.dosageType || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Strength</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedMed.strength || "N/A"}
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

      {snackbar && (
        <Snackbar description={snackbar} onClose={() => setSnackbar("")} />
      )}
    </>
  );
}

export default MedicineMaster;
