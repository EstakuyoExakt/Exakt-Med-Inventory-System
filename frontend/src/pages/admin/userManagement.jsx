import { useMemo, useState } from "react";
import {
  Users,
  ShieldCheck,
  UserCog,
  Plus,
  Search,
  PencilIcon,
  TrashIcon,
} from "lucide-react";

// Components
import Card from "../../components/card";
import ListCard from "../../components/listCard";
import Table from "../../components/table";
import Modal from "../../components/modal";
import Snackbar from "../../components/snackbar";

// Mock Data
import { users as initialUsers } from "../../data/user";

function UserManagement() {
  const [usersList, setUsersList] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalState, setModalState] = useState(""); // "" | "create" | "edit" | "delete"
  const [selectedUser, setSelectedUser] = useState(null);
  const [snackbar, setSnackbar] = useState("");

  const itemsPerPage = 6;

  // Counts
  const totalUsers = usersList.length;
  const adminCount = useMemo(
    () => usersList.filter((u) => u.role.toLowerCase() === "admin").length,
    [usersList],
  );
  const managerCount = useMemo(
    () => usersList.filter((u) => u.role.toLowerCase() === "manager").length,
    [usersList],
  );

  // Form State
  const initialForm = {
    name: "",
    username: "",
    email: "",
    password: "",
    role: "Manager",
    status: "Active",
  };
  const [formData, setFormData] = useState(initialForm);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCloseModal = () => {
    setModalState("");
    setSelectedUser(null);
    setFormData(initialForm);
  };

  // Create
  const handleOpenCreate = () => {
    setFormData(initialForm);
    setModalState("create");
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const nextId =
      usersList.length > 0 ? Math.max(...usersList.map((u) => u.id)) + 1 : 1;

    const newUser = {
      id: nextId,
      ...formData,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setUsersList((prev) => [newUser, ...prev]);
    handleCloseModal();
    setSnackbar("User account created successfully!");
  };

  // Edit
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || "",
      username: user.username || "",
      email: user.email || "",
      password: user.password || "",
      role: user.role || "Manager",
      status: user.status || "Active",
    });
    setModalState("edit");
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setUsersList((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id
          ? {
              ...u,
              ...formData,
            }
          : u,
      ),
    );
    handleCloseModal();
    setSnackbar("User updated successfully!");
  };

  // Delete
  const handleOpenDelete = (user) => {
    setSelectedUser(user);
    setModalState("delete");
  };

  const handleDeleteConfirm = () => {
    setUsersList((prev) => prev.filter((u) => u.id !== selectedUser.id));
    handleCloseModal();
    setSnackbar("User account deleted successfully!");
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return usersList.filter((u) => {
      const matchesSearch =
        (u.name && u.name.toLowerCase().includes(q)) ||
        u.username.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        u.role.toLowerCase().includes(q) ||
        (u.status && u.status.toLowerCase().includes(q));

      const matchesRole =
        filterRole === "" || u.role.toLowerCase() === filterRole.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [usersList, search, filterRole]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  // Shared Form Fields
  const UserFormFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Full Name</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            placeholder="e.g. John Doe"
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Username</label>
          <input
            name="username"
            value={formData.username}
            onChange={handleFormChange}
            placeholder="e.g. jdoe"
            required
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleFormChange}
            placeholder="e.g. jdoe@exaktmed.com"
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleFormChange}
            placeholder="Enter password"
            required
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Role</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleFormChange}
            className="input"
          >
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
          </select>
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

  return (
    <div className="w-full p-10 max-w-7xl mx-auto overflow-y-auto max-h-full flex flex-col gap-5">
      {/* Total Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-slide-up">
        <Card
          title={"Total Users"}
          action={
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          }
        >
          <span className="text-3xl font-bold text-slate-900">
            {totalUsers}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            Registered system accounts
          </p>
        </Card>
        <Card
          title={"Total Admin"}
          action={
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          }
        >
          <span className="text-3xl font-bold text-purple-600">
            {adminCount}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            Full system administrators
          </p>
        </Card>
        <Card
          title={"Total Managers"}
          action={
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCog className="w-5 h-5" />
            </div>
          }
        >
          <span className="text-3xl font-bold text-emerald-600">
            {managerCount}
          </span>
          <p className="text-xs text-slate-500 mt-1">
            Inventory & stock managers
          </p>
        </Card>
      </div>

      {/* User List Card */}
      <ListCard
        title={"User List"}
        action={
          <button className="btn-primary" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" />
            Add User
          </button>
        }
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredUsers.length}
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
              placeholder="Search by name, username, email, or role..."
              className="input pl-9"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value);
              setCurrentPage(1);
            }}
            className="input w-full sm:w-48"
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
          </select>
        </div>

        {/* User Table */}
        <Table
          headers={["Name", "Username", "Email", "Role", "Status", "Actions"]}
          isEmpty={currentUsers.length === 0}
          emptyMessage="No users found."
        >
          {currentUsers.map((user, index) => (
            <tr
              key={user.id}
              className="hover:bg-gray-50 transition-colors animate-slide-up-1 h-12"
              style={{
                animationDelay: `${index * 0.05}s`,
                animationFillMode: "both",
              }}
            >
              <td className="p-2 text-sm font-medium text-slate-900">
                {user.name}
              </td>
              <td className="p-2 text-sm text-slate-600">{user.username}</td>
              <td className="p-2 text-sm text-slate-500">{user.email}</td>
              <td className="p-2 text-sm">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role.toLowerCase() === "admin"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {user.role}
                </span>
              </td>
              <td className="p-2 text-sm">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.status === "Active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {user.status || "Active"}
                </span>
              </td>
              <td className="p-2 text-sm flex justify-center gap-2">
                <button
                  className="cursor-pointer p-2 text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                  title="Edit"
                  onClick={() => handleOpenEdit(user)}
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenDelete(user)}
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

      {/* Create User Modal */}
      <Modal
        isOpen={modalState === "create"}
        onClose={handleCloseModal}
        title="Add User Account"
      >
        <form onSubmit={handleCreateSubmit} className="grid gap-4">
          <UserFormFields />
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
              Create Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={modalState === "edit"}
        onClose={handleCloseModal}
        title="Edit User Account"
      >
        <form onSubmit={handleEditSubmit} className="grid gap-4">
          <UserFormFields />
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

      {/* Delete User Modal */}
      <Modal
        isOpen={modalState === "delete"}
        onClose={handleCloseModal}
        title="Delete User Account"
      >
        <div className="grid gap-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete user{" "}
            <span className="font-semibold text-slate-900">
              {selectedUser?.name} ({selectedUser?.username})
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

export default UserManagement;
