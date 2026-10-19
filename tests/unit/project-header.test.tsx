import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "../../messages/en.json";
import { StudioTabs } from "@/features/captions/studio-tabs";
import { shortTitle } from "@/features/projects/short-title";
import { renameProjectAction } from "@/features/projects/actions";
import { ProjectTitle } from "@/features/projects/project-title";

vi.mock("@/features/projects/actions", () => ({
  renameProjectAction: vi.fn().mockResolvedValue({ ok: true }),
  deleteProjectAction: vi.fn().mockResolvedValue({ ok: true }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("StudioTabs", () => {
  const tabs = [
    { id: "styles" as const, label: "Style" },
    { id: "transcription" as const, label: "Transcription" },
  ];

  it("shows every tab and reports the one clicked", async () => {
    const onChange = vi.fn();
    render(<StudioTabs tabs={tabs} value="styles" onChange={onChange} moreLabel="More" />);
    expect(screen.getByRole("tab", { name: "Style" })).toHaveAttribute("aria-selected", "true");
    await userEvent.click(screen.getByRole("tab", { name: "Transcription" }));
    expect(onChange).toHaveBeenCalledWith("transcription");
    expect(screen.queryByRole("button", { name: "More" })).toBeNull();
  });
});

describe("ProjectTitle", () => {
  function renderTitle() {
    return render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ProjectTitle projectId="3f1c2a9e-5b7d-4e21-8a43-9c0d6b1e7f52" title="My video" />
      </NextIntlClientProvider>,
    );
  }

  it("turns into a field with the name selected on click, saves on Enter and keeps the new name", async () => {
    renderTitle();
    await userEvent.click(screen.getByRole("button", { name: "My video" }));
    const field = screen.getByRole("textbox", { name: "Project name" });
    expect(field).toHaveValue("My video");
    await userEvent.clear(field);
    await userEvent.type(field, "Launch teaser{Enter}");
    expect(renameProjectAction).toHaveBeenCalledWith(
      "3f1c2a9e-5b7d-4e21-8a43-9c0d6b1e7f52",
      "Launch teaser",
    );
    expect(screen.getByRole("button", { name: "Launch teaser" })).toBeInTheDocument();
  });

  it("saves by itself when the field loses focus", async () => {
    renderTitle();
    await userEvent.click(screen.getByRole("button", { name: "My video" }));
    const field = screen.getByRole("textbox", { name: "Project name" });
    await userEvent.clear(field);
    await userEvent.type(field, "Demo");
    await userEvent.tab();
    expect(renameProjectAction).toHaveBeenCalledWith(
      "3f1c2a9e-5b7d-4e21-8a43-9c0d6b1e7f52",
      "Demo",
    );
  });

  it("does not save when Escape is pressed", async () => {
    renderTitle();
    await userEvent.click(screen.getByRole("button", { name: "My video" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Project name" }), "x{Escape}");
    expect(renameProjectAction).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "My video" })).toBeInTheDocument();
  });
});

describe("shortTitle", () => {
  it("keeps names of 28 characters or fewer", () => {
    expect(shortTitle("a".repeat(28))).toBe("a".repeat(28));
  });

  it("cuts after 28 characters and adds an ellipsis", () => {
    expect(shortTitle("2026_10_18_14_33_46_my_long_video_name")).toBe(
      "2026_10_18_14_33_46_my_long_…",
    );
  });
});
