import king from "../../assets/king.png";
import "../../styles/ownerHome.css";

export default function OwnerHome() {
  return (
    <div className="owner-home">
      <div className="owner-home-header owner-hero">
        <h2 className="owner-hero-title">Operations Overview</h2>
        <p className="owner-subtitle">
          High-level system summary and operational access
        </p>
      </div>

      <div className="owner-sections">
        <div className="owner-card accent-blue">
          <h4>Locations</h4>
          <p>Manage company locations and assign supervisors.</p>
        </div>

        <div className="owner-card accent-indigo">
          <h4>Users</h4>
          <p>View and manage guards and supervisors across locations.</p>
        </div>

        <div className="owner-card accent-purple">
          <h4>Pay Period Reports</h4>
          <p>Review submitted and pending payroll periods.</p>
        </div>

        <div className="owner-card accent-emerald">
          <h4>Announcements</h4>
          <p>Create and manage owner-level announcements.</p>
        </div>
      </div>
    </div>
  );
}
