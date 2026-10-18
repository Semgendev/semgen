import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import { ThemeToggle } from "@/components/theme-toggle";

const messages = {
  theme: {
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode",
  },
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.className = "";
});

describe("ThemeToggle", () => {
  it("is a single button that flips between light and dark", async () => {
    localStorage.setItem("theme", "light");
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ThemeToggle />
        </ThemeProvider>
      </NextIntlClientProvider>,
    );

    // No menu and no "system" entry: one click, the other mode.
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByText(/system/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button")[0]!);
    expect(document.documentElement).toHaveClass("dark");

    await userEvent.click(screen.getAllByRole("button")[0]!);
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
