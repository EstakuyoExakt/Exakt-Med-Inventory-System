import { useState } from "react";
import { PencilIcon, TrashIcon, Plus } from "lucide-react";
import { medicines as initialMedicines } from "../data/medicine";

// Components
import Card from "../components/card";
import Modal from "../components/modal";

function MedicineMaster() {
  const [medicines, setMedicines] = useState(initialMedicines);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);

  const emptyForm = {
    medCode: "",
    genericName: "",
    brandName: "",
    dosageType: "",
    strength: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  const handleFormChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddMedicine = (e) => {
    e.preventDefault();
    const newMed = {
      id:
        medicines.length > 0 ? Math.max(...medicines.map((m) => m.id)) + 1 : 1,
      ...formData,
    };
    setMedicines((prev) => [...prev, newMed]);
    setFormData(emptyForm);
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    setFormData(emptyForm);
    setIsModalOpen(false);
  };

  const handleOpenEdit = (med) => {
    setSelectedMed(med);
    setFormData({ medCode: med.medCode, genericName: med.genericName, brandName: med.brandName, dosageType: med.dosageType, strength: med.strength });
    setIsEditModalOpen(true);
  };

  const handleEditMedicine = (e) => {
    e.preventDefault();
    setMedicines((prev) =>
      prev.map((m) => (m.id === selectedMed.id ? { ...m, ...formData } : m))
    );
    setFormData(emptyForm);
    setSelectedMed(null);
    setIsEditModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setFormData(emptyForm);
    setSelectedMed(null);
    setIsEditModalOpen(false);
  };

  const handleOpenDelete = (med) => {
    setSelectedMed(med);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    setMedicines((prev) => prev.filter((m) => m.id !== selectedMed.id));
    setSelectedMed(null);
    setIsDeleteModalOpen(false);
  };

  const handleCloseDeleteModal = () => {
    setSelectedMed(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = (id) => {
    setMedicines(medicines.filter((med) => med.id !== id));
  };

  const itemsPerPage = 8;
  const totalPages = Math.ceil(medicines.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMedicines = medicines.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="grid gap-5 p-10 w-full max-w-7xl mx-auto max-h-full">
      {/* Medicine List table */}
      <Card
        className="animate-slide-up"
        title={"Medicine List"}
        action={
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Medicine
          </button>
        }
      >
        <div className="mt-5">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b bg-gray-50 text-gray-600 text-sm">
                <th className="p-3 font-medium">Med Code</th>
                <th className="p-3 font-medium">Generic Name</th>
                <th className="p-3 font-medium">Brand Name</th>
                <th className="p-3 font-medium">Dosage</th>
                <th className="p-3 font-medium">Strength</th>
                <th className="p-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody key={currentPage}>
              {currentMedicines.map((med, index) => (
                <tr
                  key={med.id}
                  className="hover:bg-gray-50 transition-colors animate-slide-up"
                  style={{
                    animationDelay: `${index * 0.05}s`,
                    animationFillMode: "both",
                  }}
                >
                  <td className="p-2 text-sm">{med.medCode}</td>
                  <td className="p-2 text-sm">{med.genericName}</td>
                  <td className="p-2 text-sm">{med.brandName}</td>
                  <td className="p-2 text-sm">{med.dosageType}</td>
                  <td className="p-2 text-sm">{med.strength}</td>
                  <td className="p-2 text-sm flex justify-center gap-2">
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
              {medicines.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">
                    No medicines available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {medicines.length > 6 && (
            <div className="flex justify-between items-center pt-10 pr-5 pl-5 bg-white rounded-b-xl">
              <span className="text-sm text-gray-500">
                Showing {indexOfFirstItem + 1} to{" "}
                {Math.min(indexOfLastItem, medicines.length)} of{" "}
                {medicines.length} entries
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

      {/* Add Medicine Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Add Medicine"
      >
        <form onSubmit={handleAddMedicine} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Med Code
              </label>
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
            <label className="text-sm font-medium text-gray-700">
              Brand Name
            </label>
            <input
              name="brandName"
              value={formData.brandName}
              onChange={handleFormChange}
              placeholder="e.g. Biogesic"
              required
              className="input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Strength
            </label>
            <input
              name="strength"
              value={formData.strength}
              onChange={handleFormChange}
              placeholder="e.g. 500mg"
              required
              className="input"
            />
          </div>

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
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title="Edit Medicine"
      >
        <form onSubmit={handleEditMedicine} className="grid gap-4">
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
              <label className="text-sm font-medium text-gray-700">Dosage Type</label>
              <input
                name="dosageType"
                value={formData.dosageType}
                onChange={handleFormChange}
                placeholder="e.g. Tablet, Capsule"
                required
                className="input"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Generic Name</label>
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

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={handleCloseEditModal} className="btn-secondary">
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
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
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
            <button onClick={handleCloseDeleteModal} className="btn-secondary">
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
    </div>
  );
}

export default MedicineMaster;
