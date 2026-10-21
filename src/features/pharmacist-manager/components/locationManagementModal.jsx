import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Plus,
  Sparkles,
  Snowflake,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Warehouse,
  ShieldAlert,
} from "lucide-react";
import Modal from "../../../components/common/modal";
import SearchBar from "../../../components/common/searchBar";
import Dropdown from "../../../components/common/dropdown";
import Skeleton from "../../../components/common/skeleton";
import libLocationService from "../../../services/libLocation";

const STORAGE_TYPES = [
  {
    value: "ROOM_TEMPERATURE",
    label: "Room Temperature (15°C - 25°C)",
    icon: Warehouse,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "COLD_STORAGE",
    label: "Cold Storage / Fridge (2°C - 8°C)",
    icon: Snowflake,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    value: "FREEZER",
    label: "Freezer (-20°C or below)",
    icon: Snowflake,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    value: "HAZARDOUS",
    label: "Hazardous / Cytotoxic / Flammable",
    icon: AlertTriangle,
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "OTHER",
    label: "Other / General Staging",
    icon: Warehouse,
    color: "bg-gray-50 text-gray-700 border-gray-200",
  },
];

export const getStorageTypeBadge = (type) => {
  const match = STORAGE_TYPES.find((s) => s.value === type) || STORAGE_TYPES[0];
  const Icon = match.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${match.color}`}
    >
      <Icon className="w-3 h-3" />
      <span>{match.label.split("(")[0].trim()}</span>
    </span>
  );
};

export default function LocationManagementModal({
  isOpen,
  onClose,
  facilityId,
  onLocationCreated,
  initialView = "list", // 'list' or 'create'
}) {
  const [activeTab, setActiveTab] = useState(initialView);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStorageFilter, setSelectedStorageFilter] = useState("ALL");

  // Form State for creating/editing
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    storageType: "ROOM_TEMPERATURE",
    description: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchLocations = useCallback(async () => {
    if (!facilityId) return;
    try {
      setIsLoading(true);
      setErrorMsg("");
      const data = await libLocationService.getAllLocations({ facilityId });
      setLocations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load locations:", err);
      setErrorMsg(err.response?.data?.message || "Failed to load locations.");
    } finally {
      setIsLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
      setActiveTab(initialView);
      resetForm();
    }
  }, [isOpen, fetchLocations, initialView]);

  const resetForm = () => {
    setEditingLocation(null);
    setFormData({
      code: "",
      storageType: "ROOM_TEMPERATURE",
      description: "",
      isActive: true,
    });
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSuggestCode = async () => {
    try {
      setIsSuggesting(true);
      setErrorMsg("");
      const suggested = await libLocationService.suggestCode(
        formData.storageType,
        facilityId,
      );
      if (suggested) {
        setFormData((prev) => ({ ...prev, code: suggested }));
      }
    } catch (err) {
      console.error("Failed to suggest code:", err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleEditClick = (loc) => {
    setEditingLocation(loc);
    setFormData({
      code: loc.code || "",
      storageType: loc.storageType || "ROOM_TEMPERATURE",
      description: loc.description || "",
      isActive: loc.isActive !== undefined ? loc.isActive : true,
    });
    setActiveTab("create");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    try {
      setIsSubmitting(true);
      const payload = {
        code: formData.code?.trim() || null,
        storageType: formData.storageType,
        description: formData.description?.trim() || null,
        facilityId: facilityId,
        isActive: formData.isActive,
      };

      let result;
      if (editingLocation) {
        result = await libLocationService.updateLocation(
          editingLocation.id,
          payload,
        );
        setSuccessMsg(`Location '${result.code}' updated successfully.`);
      } else {
        result = await libLocationService.createLocation(payload);
        setSuccessMsg(`Location '${result.code}' created successfully.`);
        if (onLocationCreated) {
          onLocationCreated(result);
        }
      }

      await fetchLocations();
      resetForm();
      // If user came here via quick-add, auto-close after brief delay or switch back to list
      if (initialView === "create" && onLocationCreated) {
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setActiveTab("list");
      }
    } catch (err) {
      console.error("Failed to save location:", err);
      setErrorMsg(
        err.response?.data?.message ||
          err.message ||
          "Failed to save location.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (loc) => {
    try {
      setErrorMsg("");
      const updated = await libLocationService.updateLocation(loc.id, {
        code: loc.code,
        storageType: loc.storageType,
        description: loc.description,
        facilityId: facilityId,
        isActive: !loc.isActive,
      });
      setLocations((prev) => prev.map((l) => (l.id === loc.id ? updated : l)));
    } catch (err) {
      console.error("Failed to toggle location status:", err);
      setErrorMsg(
        err.response?.data?.message || "Failed to update location status.",
      );
    }
  };

  const filteredLocations = locations.filter((loc) => {
    const matchesSearch =
      !search.trim() ||
      loc.code?.toLowerCase().includes(search.toLowerCase().trim()) ||
      loc.description?.toLowerCase().includes(search.toLowerCase().trim());
    const matchesStorage =
      selectedStorageFilter === "ALL" ||
      loc.storageType === selectedStorageFilter;
    return matchesSearch && matchesStorage;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Physical Storage Locations Management"
      size="3xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("list");
                resetForm();
              }}
              className={`btn text-xs px-3.5 py-1.5 transition-all ${
                activeTab === "list"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "btn-secondary border-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              All Locations ({locations.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("create");
                resetForm();
              }}
              className={`btn text-xs px-3.5 py-1.5 transition-all ${
                activeTab === "create"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "btn-secondary border-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingLocation ? "Edit Location" : "Add Location"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchLocations}
            disabled={isLoading}
            className="btn-secondary p-1.5 text-gray-500 hover:text-blue-600 shadow-2xs"
            title="Refresh list"
            aria-label="Refresh locations list"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`}
            />
          </button>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: LIST LOCATIONS */}
        {activeTab === "list" && (
          <div className="space-y-3">
            {/* Filter & Search Bar using Common Components */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
              <div className="w-full sm:w-72">
                <SearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch("")}
                  placeholder="Search code or description..."
                />
              </div>

              <Dropdown
                value={selectedStorageFilter}
                onChange={(e) => setSelectedStorageFilter(e.target.value)}
                size="sm"
                className="w-full sm:w-56"
                options={[
                  { value: "ALL", label: "All Storage Types" },
                  ...STORAGE_TYPES.map((s) => ({
                    value: s.value,
                    label: s.label.split("(")[0].trim(),
                  })),
                ]}
              />
            </div>

            {/* Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-95 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-600 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">Location Code</th>
                    <th className="px-4 py-3">Storage Type</th>
                    <th className="px-4 py-3">Description / Zone</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr key={`loc-skel-${index}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-4 h-4 rounded shrink-0" />
                            <Skeleton className="h-4 w-20 rounded" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-5 w-24 rounded-full" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-36 rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Skeleton className="h-4 w-20 rounded ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : filteredLocations.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="text-center py-10 text-gray-400 text-sm"
                      >
                        No storage locations found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLocations.map((loc) => (
                      <tr
                        key={loc.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-mono">{loc.code}</span>
                        </td>
                        <td className="px-4 py-3">
                          {getStorageTypeBadge(loc.storageType)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">
                          {loc.description || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {loc.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                              Deactivated
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEditClick(loc)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(loc)}
                            className={`text-xs font-semibold cursor-pointer ${
                              loc.isActive
                                ? "text-amber-600 hover:text-amber-700"
                                : "text-emerald-600 hover:text-emerald-700"
                            } hover:underline`}
                          >
                            {loc.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: CREATE / EDIT LOCATION FORM */}
        {activeTab === "create" && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Storage Type with Dropdown Component */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Storage Type <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  value={formData.storageType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      storageType: e.target.value,
                    }))
                  }
                  required
                  size="md"
                  options={STORAGE_TYPES.map((s) => ({
                    value: s.value,
                    label: s.label,
                  }))}
                />
                <span className="text-[11px] text-gray-400">
                  Determines environmental controls (e.g. ambient vs
                  refrigerator).
                </span>
              </div>

              {/* Location Code with Suggest Button */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">
                    Location Code
                  </label>
                  {!editingLocation && (
                    <button
                      type="button"
                      onClick={handleSuggestCode}
                      disabled={isSuggesting}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>
                        {isSuggesting ? "Generating..." : "Auto-Suggest"}
                      </span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. SHF-001, REF-01 (or leave blank to auto-generate)"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="input uppercase font-mono tracking-wide text-xs"
                />
                <span className="text-[11px] text-gray-400">
                  Matches your pharmacy shelf/refrigerator sticker label.
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Description / Zone Details (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Main dispensary room, right wall, Shelf 3, Bin B"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="input text-xs"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="locIsActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="locIsActive"
                className="text-xs font-semibold text-gray-700 cursor-pointer select-none"
              >
                Location is Active (available for new batch assignments)
              </label>
            </div>

            {/* Actions with btn-secondary and btn-primary classes */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  if (initialView === "create" && onLocationCreated) {
                    onClose();
                  } else {
                    setActiveTab("list");
                    resetForm();
                  }
                }}
                disabled={isSubmitting}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary text-xs"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {editingLocation ? "Save Changes" : "Create Location"}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
