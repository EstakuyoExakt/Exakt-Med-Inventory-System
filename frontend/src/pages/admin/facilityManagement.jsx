import { useMemo, useState } from "react";
import {
  Hospital,
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
import Modal from "../../components/modal";
import Snackbar from "../../components/snackbar";

// Mock Data
import { facilities as initialFacilities } from "../../data/facility";

function FacilityManagement() {
  const [facilitiesList, setFacilitiesList] = useState(initialFacilities);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalState, setModalState] = useState(""); // "" | "create" | "edit" | "delete" | "view"
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [snackbar, setSnackbar] = useState("");

  const itemsPerPage = 6;

  // Counts
  const totalFacilities = facilitiesList.length;
  const activeCount = useMemo(
    () => facilitiesList.filter((f) => f.status === "Active").length,
    [facilitiesList],
  );
  const inactiveCount = useMemo(
    () => facilitiesList.filter((f) => f.status === "Inactive").length,
    [facilitiesList],
  );

  // Form State
  const initialForm = {
    facilityCode: "",
    name: "",
    type: "",
    location: "",
    contactPerson: "",
    contactNumber: "",
    status: "Active",
  };
  const [formData, setFormData] = useState(initialForm);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCloseModal = () => {
    setModalState("");
    setSelectedFacility(null);
    setFormData(initialForm);
  };

  // View
  const handleOpenView = (fac) => {
    setSelectedFacility(fac);
    setModalState("view");
  };

  // Create
  const handleOpenCreate = () => {
    const nextCode = `FAC-${String(facilitiesList.length + 1).padStart(3, "0")}`;
    setFormData({
      ...initialForm,
      facilityCode: nextCode,
    });
    setModalState("create");
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const nextId =
      facilitiesList.length > 0
        ? Math.max(...facilitiesList.map((f) => f.id)) + 1
        : 1;

    const newFacility = {
      id: nextId,
      ...formData,
    };

    setFacilitiesList((prev) => [newFacility, ...prev]);
    handleCloseModal();
    setSnackbar("Facility added successfully!");
  };

  // Edit
  const handleOpenEdit = (fac) => {
    setSelectedFacility(fac);
    setFormData({
      facilityCode: fac.facilityCode || "",
      name: fac.name || "",
      type: fac.type || "",
      location: fac.location || "",
      contactPerson: fac.contactPerson || "",
      contactNumber: fac.contactNumber || "",
      status: fac.status || "Active",
    });
    setModalState("edit");
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setFacilitiesList((prev) =>
      prev.map((f) =>
        f.id === selectedFacility.id
          ? {
              ...f,
              ...formData,
            }
          : f,
      ),
    );
    handleCloseModal();
    setSnackbar("Facility updated successfully!");
  };

  // Delete
  const handleOpenDelete = (fac) => {
    setSelectedFacility(fac);
    setModalState("delete");
  };

  const handleDeleteConfirm = () => {
    setFacilitiesList((prev) =>
      prev.filter((f) => f.id !== selectedFacility.id),
    );
    handleCloseModal();
    setSnackbar("Facility deleted successfully!");
  };

  // Filtered Facilities
  const filteredFacilities = useMemo(() => {
    const q = search.toLowerCase();
    return facilitiesList.filter((f) => {
      const matchesSearch =
        f.facilityCode.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.contactPerson.toLowerCase().includes(q) ||
        f.contactNumber.toLowerCase().includes(q) ||
        f.status.toLowerCase().includes(q);

      const matchesStatus =
        filterStatus === "" ||
        f.status.toLowerCase() === filterStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [facilitiesList, search, filterStatus]);

  const totalPages = Math.ceil(filteredFacilities.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentFacilities = filteredFacilities.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  // Form Fields Component
  const FacilityFormFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Facility Code
          </label>
          <input
            name="facilityCode"
            value={formData.facilityCode}
            onChange={handleFormChange}
            placeholder="e.g. FAC-001"
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Facility Name
          </label>
          <input
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            placeholder="e.g. Central Pharmacy Warehouse"
            required
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Facility Type
          </label>
          <input
            name="type"
            value={formData.type}
            onChange={handleFormChange}
            placeholder="e.g. Central Warehouse, Hospital Ward"
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

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Location</label>
        <input
          name="location"
          value={formData.location}
          onChange={handleFormChange}
          placeholder="e.g. Main Hospital Building, Basement 1"
          required
          className="input"
        />
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
            placeholder="e.g. Dr. Roberto Santos"
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Contact Number
          </label>
          <input
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleFormChange}
            placeholder="e.g. +63 917 123 4567"
            required
            className="input"
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="w-full p-10 max-w-7xl mx-auto overflow-y-auto max-h-full flex flex-col gap-5">
      {/* Total Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-slide-up">
        <Card
          title={"Total Facility"}
          action={
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Hospital className="w-5 h-5" />
            </div>
          }
        >
          <span className="text-3xl font-bold text-slate-900">
            {totalFacilities}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            Registered health facilities
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
          <p className="text-xs text-slate-500 mt-1">Operational facilities</p>
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
            Inactive / closed facilities
          </p>
        </Card>
      </div>

      {/* Facility List Card */}
      <ListCard
        title={"Facility List"}
        action={
          <button className="btn-primary" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" />
            Add Facility
          </button>
        }
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredFacilities.length}
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
              placeholder="Search by code, name, type, location, or contact..."
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
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Facility Table */}
        <Table
          headers={[
            "Facility Code",
            "Name",
            "Type",
            "Location",
            "Contact Person",
            "Status",
            "Actions",
          ]}
          isEmpty={currentFacilities.length === 0}
          emptyMessage="No facilities found."
        >
          {currentFacilities.map((fac, index) => (
            <tr
              key={fac.id}
              className="hover:bg-gray-50 transition-colors animate-slide-up-1 h-12"
              style={{
                animationDelay: `${index * 0.05}s`,
                animationFillMode: "both",
              }}
            >
              <td className="p-2 text-sm font-medium text-slate-700">
                {fac.facilityCode}
              </td>
              <td className="p-2 text-sm font-medium text-slate-900">
                {fac.name}
              </td>
              <td className="p-2 text-sm text-slate-600">{fac.type}</td>
              <td className="p-2 text-sm text-slate-500">{fac.location}</td>
              <td className="p-2 text-sm text-slate-700">
                {fac.contactPerson}
              </td>
              <td className="p-2 text-sm">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    fac.status === "Active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {fac.status}
                </span>
              </td>
              <td className="p-2 text-sm flex justify-center gap-2">
                <button
                  className="cursor-pointer p-2 text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                  title="View Details"
                  onClick={() => handleOpenView(fac)}
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  className="cursor-pointer p-2 text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                  title="Edit"
                  onClick={() => handleOpenEdit(fac)}
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenDelete(fac)}
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

      {/* View Facility Modal */}
      <Modal
        isOpen={modalState === "view"}
        onClose={handleCloseModal}
        title="Facility Details"
      >
        {selectedFacility && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Facility Code
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedFacility.facilityCode}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-medium ${
                    selectedFacility.status === "Active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {selectedFacility.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 max-w-md mx-auto w-full">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Facility Name
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedFacility.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Facility Type
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedFacility.type}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Location</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedFacility.location}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Contact Person
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedFacility.contactPerson}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Contact Number
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedFacility.contactNumber}
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

      {/* Add Facility Modal */}
      <Modal
        isOpen={modalState === "create"}
        onClose={handleCloseModal}
        title="Add Facility"
      >
        <form onSubmit={handleCreateSubmit} className="grid gap-4">
          <FacilityFormFields />
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
              Add Facility
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Facility Modal */}
      <Modal
        isOpen={modalState === "edit"}
        onClose={handleCloseModal}
        title="Edit Facility"
      >
        <form onSubmit={handleEditSubmit} className="grid gap-4">
          <FacilityFormFields />
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

      {/* Delete Facility Modal */}
      <Modal
        isOpen={modalState === "delete"}
        onClose={handleCloseModal}
        title="Delete Facility"
      >
        <div className="grid gap-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete facility{" "}
            <span className="font-semibold text-slate-900">
              {selectedFacility?.name} ({selectedFacility?.facilityCode})
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

export default FacilityManagement;
