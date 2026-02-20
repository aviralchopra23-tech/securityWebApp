import SharedScheduleView from "../../components/SharedScheduleView";

export default function SupervisorSchedule() {
  return (
    <SharedScheduleView
      canCreate
      canEdit
      editPath="/supervisor/schedule/edit"
    />
  );
}