import { useQuery } from "@tanstack/react-query";

import { listOrganizationActivity } from "./activity.api.js";
import { ActivityTimeline } from "./ActivityFeed.js";
import { useLiveActivity } from "../../hooks/use-live-activity.js";

export function OrganizationActivityFeed({
  organizationId,
}: {
  organizationId: string;
}) {
  const activityQuery = useQuery({
    queryKey: ["organization-activity", organizationId],
    queryFn: () => listOrganizationActivity(organizationId),
  });

  useLiveActivity(organizationId, [
    "organization-activity",
    organizationId,
  ]);

  return (
    <ActivityTimeline
      title="Organization activity"
      description="Projects, members, tasks, and labels across this organization."
      isLoading={activityQuery.isLoading}
      isError={activityQuery.isError}
      activities={activityQuery.data ?? []}
      emptyText="No activity yet. Create a project or invite a member to get started."
    />
  );
}
