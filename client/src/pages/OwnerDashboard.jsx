import { useEffect, useState } from "react";
import {
  getLocations,
  createLocation,
  assignSupervisor,
  createUser
} from "../api/ownerApi";
import { logout } from "../utils/logout";

export default function OwnerDashboard() {
  const [locations, setLocations] = useState([]);
  const [locForm, setLocForm] = useState({ name: "", address: "" });
  const [userForm, setUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "SUPERVISOR"
  });
  const [assignForm, setAssignForm] = useState({
    locationId: "",
    supervisorId: ""
  });

  const loadLocations = async () => {
    const data = await getLocations();
    setLocations(data);
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    await createLocation(locForm);
    setLocForm({ name: "", address: "" });
    loadLocations();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    await createUser(userForm);
    alert("User created");
  };

  const handleAssignSupervisor = async (e) => {
    e.preventDefault();
    await assignSupervisor(assignForm);
    alert("Supervisor assigned");
    loadLocations();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Owner Dashboard</h2>
      <button onClick={logout}>Logout</button>

      <hr />

      <h3>Create Location</h3>
      <form onSubmit={handleCreateLocation}>
        <input
          placeholder="Name"
          value={locForm.name}
          onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
          required
        />
        <input
          placeholder="Address"
          value={locForm.address}
          onChange={(e) => setLocForm({ ...locForm, address: e.target.value })}
          required
        />
        <button>Create</button>
      </form>

      <hr />

      <h3>Create User</h3>
      <form onSubmit={handleCreateUser}>
        <input placeholder="First Name" onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} required />
        <input placeholder="Last Name" onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })} required />
        <input placeholder="Email" onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
        <input placeholder="Password" onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required />
        <select onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="GUARD">Guard</option>
        </select>
        <button>Create User</button>
      </form>

      <hr />

      <h3>Assign Supervisor</h3>
      <form onSubmit={handleAssignSupervisor}>
        <input
          placeholder="Location ID"
          onChange={(e) => setAssignForm({ ...assignForm, locationId: e.target.value })}
          required
        />
        <input
          placeholder="Supervisor ID"
          onChange={(e) => setAssignForm({ ...assignForm, supervisorId: e.target.value })}
          required
        />
        <button>Assign</button>
      </form>

      <hr />

      <h3>Locations</h3>
      <ul>
        {locations.map((l) => (
          <li key={l._id}>
            {l.name} — Supervisor:{" "}
            {l.supervisorId
              ? `${l.supervisorId.firstName} ${l.supervisorId.lastName}`
              : "Not assigned"}
          </li>
        ))}
      </ul>
    </div>
  );
}
