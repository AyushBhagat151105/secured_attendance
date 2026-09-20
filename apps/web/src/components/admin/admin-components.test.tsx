import { describe, it, expect } from "bun:test";
import { renderToString } from "react-dom/server";
import { IconUsers, IconSchool } from "@tabler/icons-react";
import { AdminKpiCard } from "./kpi-card";
import { AdminPageHeader } from "./page-header";

describe("Admin Design System Components", () => {
  it("renders AdminKpiCard with Tabler icon forwardRef component reference", () => {
    const html = renderToString(
      <AdminKpiCard
        title="Total Students"
        value={120}
        icon={IconUsers}
        color="blue"
      />,
    );
    expect(html).toContain("Total Students");
    expect(html).toContain("120");
    expect(html).toContain("<svg");
  });

  it("renders AdminKpiCard with JSX element icon", () => {
    const html = renderToString(
      <AdminKpiCard
        title="Active Students"
        value={110}
        icon={<IconUsers className="size-4 custom-class" />}
        color="emerald"
      />,
    );
    expect(html).toContain("Active Students");
    expect(html).toContain("110");
    expect(html).toContain("custom-class");
  });

  it("renders AdminPageHeader with Tabler icon forwardRef component reference", () => {
    const html = renderToString(
      <AdminPageHeader
        title="Student Management"
        subtitle="Manage student records and attendance"
        icon={IconSchool}
      />,
    );
    expect(html).toContain("Student Management");
    expect(html).toContain("Manage student records and attendance");
    expect(html).toContain("<svg");
  });

  it("renders AdminPageHeader with JSX element icon", () => {
    const html = renderToString(
      <AdminPageHeader
        title="Student Management"
        subtitle="Manage student records and attendance"
        icon={<IconSchool className="size-6 text-primary" />}
      />,
    );
    expect(html).toContain("Student Management");
    expect(html).toContain("<svg");
  });
});
