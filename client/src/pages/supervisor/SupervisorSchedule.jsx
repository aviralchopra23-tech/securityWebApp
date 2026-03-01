import SharedScheduleView from "../../components/SharedScheduleView";

export default function SupervisorSchedule() {
  return (
    <SharedScheduleView
      variant="supervisor"
      canCreate
      canEdit
      editPath="/supervisor/schedule/edit"
    />
  );
}