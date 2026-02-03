/**
 * plan_patchm1_m2: AgiOpsDock tests
 * - BulkAnchors hidden by default (showBulkAnchors not passed or false)
 */

// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ViewModeProvider } from "@/src/lib/stores/view-mode-store";
import { AgiOpsDock } from "../AgiOpsDock";
import type { ScheduleActivity } from "@/lib/ssot/schedule";

const minActivities: ScheduleActivity[] = [];

function renderAgiOpsDock(props: {
  activities?: ScheduleActivity[];
  setActivities?: (next: ScheduleActivity[]) => void;
  showBulkAnchors?: boolean;
}) {
  const activities = props.activities ?? minActivities;
  const setActivities = props.setActivities ?? vi.fn();
  return render(
    <ViewModeProvider>
      <AgiOpsDock activities={activities} setActivities={setActivities} {...props} />
    </ViewModeProvider>
  );
}

describe("AgiOpsDock", () => {
  it("BulkAnchors hidden by default", () => {
    renderAgiOpsDock({ activities: minActivities, setActivities: vi.fn() });

    expect(screen.queryByText(/Bulk Anchors \(for \/bulk\)/)).toBeNull();
  });
});
