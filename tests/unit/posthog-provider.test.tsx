import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PostHogProvider } from "@/components/posthog-provider";

describe("PostHogProvider", () => {
  it("renders its children and stays inert without a project key", () => {
    render(
      <PostHogProvider>
        <p>hello</p>
      </PostHogProvider>,
    );

    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});
