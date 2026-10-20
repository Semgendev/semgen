import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "../../messages/en.json";
import type { CaptionColors } from "@/features/captions/colors";
import { SettingsPanel } from "@/features/captions/settings-panel";
import type { CaptionTweaks } from "@/features/captions/tweaks";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// A stand-in for the studio: it keeps the state the panel edits, and records what it is told.
function Harness({
  spies,
  startColors = {},
  startTweaks = {},
  startCustom = [],
}: {
  spies: {
    onReplay: (mode: "once" | "stop") => void;
    onAddCustomColor: (color: string) => void;
    onRemoveCustomColor: (color: string) => void;
    onTweaks: (tweaks: CaptionTweaks) => void;
    onColors: (colors: CaptionColors) => void;
  };
  startColors?: CaptionColors;
  startTweaks?: CaptionTweaks;
  startCustom?: string[];
}) {
  const [colors, setColors] = useState(startColors);
  const [tweaks, setTweaks] = useState(startTweaks);
  return (
    <SettingsPanel
      colors={colors}
      tweaks={tweaks}
      customColors={startCustom}
      onColors={(next) => {
        spies.onColors(next);
        setColors(next);
      }}
      onTweaks={(next) => {
        spies.onTweaks(next);
        setTweaks(next);
      }}
      onAddCustomColor={spies.onAddCustomColor}
      onRemoveCustomColor={spies.onRemoveCustomColor}
      onReplay={spies.onReplay}
      onResetAll={() => {
        setColors({});
        setTweaks({});
      }}
    />
  );
}

function setup(props: Partial<Parameters<typeof Harness>[0]> = {}) {
  const spies = {
    onReplay: vi.fn(),
    onAddCustomColor: vi.fn(),
    onRemoveCustomColor: vi.fn(),
    onTweaks: vi.fn(),
    onColors: vi.fn(),
  };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Harness spies={spies} {...props} />
    </NextIntlClientProvider>,
  );
  return { spies, user: userEvent.setup() };
}

// the content of one group (folded groups stay in the page, inert: always look inside one)
const region = (name: string) =>
  within(screen.getByRole("region", { name: new RegExp(`^${name}`) }));

const section = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });

describe("settings panel — groups that unfold", () => {
  it("opens the colours first and keeps the others folded", () => {
    setup();
    expect(section("Colours")).toHaveAttribute("aria-expanded", "true");
    for (const name of ["Font", "Size", "Animation", "Position", "Outline"]) {
      expect(section(name)).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("unfolds and folds a group with its header", async () => {
    const { user } = setup();
    await user.click(section("Animation"));
    expect(section("Animation")).toHaveAttribute("aria-expanded", "true");
    await user.click(section("Animation"));
    expect(section("Animation")).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the current choice in the header of each group", async () => {
    const { user } = setup({ startTweaks: { position: "top", animation: "pop" } });
    expect(section("Position").textContent).toContain("Top");
    expect(section("Animation").textContent).toContain("Spring");
    expect(section("Font").textContent).toContain("As designed");
    await user.click(section("Font"));
  });
});

describe("settings panel — two fonts", () => {
  it("picks a font for the text and another for the key word", async () => {
    const { spies, user } = setup();
    await user.click(section("Font"));
    await user.click(screen.getByRole("radio", { name: "Anton" }));
    await user.click(screen.getByRole("tab", { name: "Key word" }));
    await user.click(screen.getByRole("radio", { name: "Sora" }));
    expect(spies.onTweaks).toHaveBeenLastCalledWith({ fonts: { text: "anton", emphasis: "sora" } });
    expect(section("Font").textContent).toContain("Anton · Sora");
  });

  it("goes back to the original font of one look only", async () => {
    const { spies, user } = setup({ startTweaks: { fonts: { text: "anton", emphasis: "sora" } } });
    await user.click(section("Font"));
    await user.click(region("Font").getByRole("radio", { name: "As designed" }));
    expect(spies.onTweaks).toHaveBeenLastCalledWith({ fonts: { emphasis: "sora" } });
  });

  it("splits the first version's single font so changing one look keeps the other", async () => {
    const { spies, user } = setup({ startTweaks: { font: "bebas" } });
    await user.click(section("Font"));
    await user.click(screen.getByRole("tab", { name: "Key word" }));
    await user.click(screen.getByRole("radio", { name: "Syne" }));
    expect(spies.onTweaks).toHaveBeenLastCalledWith({ fonts: { text: "bebas", emphasis: "syne" } });
  });
});

describe("settings panel — the other groups", () => {
  it("plays an animation once when it is chosen, and stops for none", async () => {
    const { spies, user } = setup();
    await user.click(section("Animation"));
    await user.click(screen.getByRole("radio", { name: "Fade" }));
    expect(spies.onReplay).toHaveBeenLastCalledWith("once");
    // choosing the same one again plays it again
    await user.click(screen.getByRole("radio", { name: "Fade" }));
    expect(spies.onReplay).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("radio", { name: "None" }));
    expect(spies.onReplay).toHaveBeenLastCalledWith("stop");
  });

  it("changes the size of the text and of the key word on their own", async () => {
    const { spies, user } = setup();
    await user.click(section("Size"));
    fireEvent.change(screen.getByRole("slider", { name: "Text size" }), {
      target: { value: "110" },
    });
    expect(spies.onTweaks).toHaveBeenLastCalledWith({ sizes: { text: 110 } });
    fireEvent.change(screen.getByRole("slider", { name: "Key word size" }), {
      target: { value: "95" },
    });
    expect(spies.onTweaks).toHaveBeenLastCalledWith({ sizes: { text: 110, emphasis: 95 } });
    // back to 100 % means "as designed": the setting disappears
    fireEvent.change(screen.getByRole("slider", { name: "Text size" }), {
      target: { value: "100" },
    });
    expect(spies.onTweaks).toHaveBeenLastCalledWith({ sizes: { emphasis: 95 } });
  });

  it("offers four outlines and shows the colour only when there is one", async () => {
    const { user } = setup();
    await user.click(section("Outline"));
    for (const name of ["No outline", "Thin", "Thick", "Extra thick"]) {
      expect(screen.getByRole("radio", { name })).toBeInTheDocument();
    }
    expect(screen.queryByText("Outline colour")).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Thin" }));
    expect(screen.getByText("Outline colour")).toBeInTheDocument();
  });

  it("has one 'As designed' tile per group, never a full-width bar", async () => {
    const { user } = setup();
    for (const name of ["Animation", "Position", "Outline"]) await user.click(section(name));
    for (const name of ["Animation", "Position", "Outline"]) {
      const tiles = region(name).getAllByRole("radio", { name: "As designed" });
      expect(tiles, name).toHaveLength(1);
      expect(tiles[0]!.className).toContain("w-[calc(50%-0.25rem)]");
    }
  });

  it("resets everything with one button that appears only when something changed", async () => {
    const { user } = setup();
    expect(screen.queryByRole("button", { name: "Reset all settings" })).toBeNull();
    await user.click(section("Position"));
    await user.click(screen.getByRole("radio", { name: "Middle" }));
    await user.click(screen.getByRole("button", { name: "Reset all settings" }));
    expect(screen.queryByRole("button", { name: "Reset all settings" })).toBeNull();
  });
});

describe("settings panel — colours", () => {
  // the colours group is open at the start: its first field is the text colour
  function setupColors() {
    const made = setup({ startCustom: ["#123456"] });
    const input = screen.getAllByLabelText("Colour code")[0] as HTMLInputElement;
    const form = input.closest("form")!;
    return { ...made, input, validate: within(form).getByRole("button", { name: "Confirm" }) };
  }

  it("keeps the look of round swatches, with the colour picker, and no big editor", () => {
    setupColors();
    const group = within(screen.getByRole("region", { name: /^Colours/ }));
    expect(group.getAllByRole("button", { name: "Colour #FFFFFF" }).length).toBeGreaterThan(0);
    expect(group.getAllByText("Pick a colour with the mouse").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(screen.queryByText(/^RGB/)).toBeNull();
  });

  it("accepts a code with or without the #, in any case, and 3 digits", async () => {
    const { spies, user, input, validate } = setupColors();
    await user.type(input, "ff8800");
    await user.click(validate);
    expect(spies.onColors).toHaveBeenLastCalledWith({ text: "#FF8800" });
    await user.type(input, "#00ff00");
    await user.click(validate);
    expect(spies.onColors).toHaveBeenLastCalledWith({ text: "#00FF00" });
    await user.type(input, "FFF");
    await user.click(validate);
    expect(spies.onColors).toHaveBeenLastCalledWith({ text: "#FFFFFF" });
  });

  it("applies nothing until the small check button (or Enter) is used", async () => {
    const { spies, user, input } = setupColors();
    await user.type(input, "FF0000");
    expect(spies.onColors).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(spies.onColors).toHaveBeenLastCalledWith({ text: "#FF0000" });
    expect(input.value).toBe("");
  });

  it("keeps a new colour in the account, but not one that is ready-made", async () => {
    const { spies, user, input, validate } = setupColors();
    await user.type(input, "12ABEF");
    await user.click(validate);
    expect(spies.onAddCustomColor).toHaveBeenCalledWith("#12ABEF");
    spies.onAddCustomColor.mockClear();
    await user.type(input, "ffffff");
    await user.click(validate);
    expect(spies.onAddCustomColor).not.toHaveBeenCalled();
    await user.type(input, "123456");
    await user.click(validate);
    expect(spies.onAddCustomColor).not.toHaveBeenCalled();
  });

  it("explains a wrong code and does not allow confirming it", async () => {
    const { spies, user, input, validate } = setupColors();
    await user.type(input, "GG12");
    expect(screen.getByRole("alert")).toHaveTextContent("Not a valid code");
    expect(validate).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(spies.onColors).not.toHaveBeenCalled();
  });

  it("clears the field with Escape", async () => {
    const { user, input } = setupColors();
    await user.type(input, "FF00");
    await user.keyboard("{Escape}");
    expect(input.value).toBe("");
  });

  it("shows the person's colours with the others and lets them delete one", async () => {
    const { spies, user } = setupColors();
    await user.click(screen.getAllByRole("button", { name: "Delete the colour #123456" })[0]!);
    expect(spies.onRemoveCustomColor).toHaveBeenCalledWith("#123456");
    expect(screen.getAllByRole("button", { name: "Colour #123456" }).length).toBeGreaterThan(0);
  });
});
