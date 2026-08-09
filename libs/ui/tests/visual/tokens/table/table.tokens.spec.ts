import { nextTick } from "vue";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import DeltaIndicator from "../../../../src/components/table/components/DeltaIndicator.vue";
import TableEmptyState from "../../../../src/components/table/components/TableEmptyState.vue";
import TablePagination from "../../../../src/components/table/components/TablePagination.vue";
import VTable from "../../../../src/components/table/VTable.vue";
import { makeColumns, makeFixedColumns, makeRows, makeTotalRow } from "../../../setup/table";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor } from "../../../setup/tokens";

/**
 * The table's SCSS is a partial set under `assets/styles/`, outside the
 * per-component convention the guard enforces for the other five categories —
 * which is exactly why it needs this layer. Nothing else checks that a table
 * surface is still bound to its token, or that the dark theme reached it.
 *
 * Every assertion resolves the token through a probe first, so both sides are
 * normalised by the same engine.
 */

const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(null)));

describe.each(THEME_CASES)("table tokens — %s theme", (theme) => {
  async function table(props: Record<string, unknown> = {}): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VTable, {
      props: {
        columns: makeColumns(),
        data: makeRows(5),
        virtualized: false,
        height: "400px",
        ...props,
      },
    });
    await nextTick();
    await frame();
    return screen.container as HTMLElement;
  }

  const styleOf = async (selector: string, props: Record<string, unknown> = {}) => {
    const el = await table(props);
    return getComputedStyle(el.querySelector(selector) as HTMLElement);
  };

  describe("surfaces", () => {
    it("draws the wrapper on the surface token", async () => {
      expect((await styleOf(".v-table-wrapper")).backgroundColor)
        .toBe(tokenAsColor("--ui-surface"));
    });

    it("rounds the wrapper at 16px — a literal, not a token", async () => {
      // `_wrapper.scss` writes `border-radius: 1rem` rather than reaching for
      // `--ui-radius-*`, and the pagination bar repeats the same literal so the
      // two corners agree. Pinned as the literal it is; making it a token is a
      // design-system change, not a test fix.
      expect((await styleOf(".v-table-wrapper")).borderTopLeftRadius).toBe("16px");
    });

    it("borders the wrapper on the subtle border token", async () => {
      expect((await styleOf(".v-table-wrapper")).borderTopColor)
        .toBe(tokenAsColor("--ui-border-subtle"));
    });

    it("tints the header with the surface-tinted pair", async () => {
      // A gradient, so the colour lives in background-image; backgroundColor
      // stays transparent and asserting on it would prove nothing.
      const header = await styleOf(".v-table-header-cell");
      expect(header.backgroundImage).toContain(tokenAsColor("--ui-surface-tinted"));
      expect(header.backgroundImage).toContain(tokenAsColor("--ui-surface-tinted-deep"));
    });

    it("underlines the header with the strong border token", async () => {
      // Stronger than the cell separators below it, so the header reads as a
      // boundary rather than as one more row.
      expect((await styleOf(".v-table-header-cell")).borderBottomColor)
        .toBe(tokenAsColor("--ui-border-strong"));
    });

    it("draws header text on the foreground token", async () => {
      expect((await styleOf(".v-table-header-label")).color)
        .toBe(tokenAsColor("--ui-foreground"));
    });

    it("separates cells with the border token", async () => {
      expect((await styleOf(".v-table-cell")).borderBottomColor)
        .toBe(tokenAsColor("--ui-border"));
    });
  });

  describe("fixed columns", () => {
    it("gives a pinned cell an opaque background, so rows cannot show through", async () => {
      const style = await styleOf(".v-table-cell.v-table-fixed-left", {
        columns: makeFixedColumns(),
      });
      expect(style.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    });

    it("marks the last pinned column with a brand-tinted edge", async () => {
      const style = await styleOf(".v-table-fixed-left-last", { columns: makeFixedColumns() });

      expect(style.borderRightWidth).toBe("2px");
      expect(style.borderRightColor).not.toBe(tokenAsColor("--ui-border"));
    });
  });

  describe("total row", () => {
    it("draws on a surface of its own", async () => {
      const style = await styleOf(".v-table-total-cell", { totalRow: makeTotalRow() });
      expect(style.backgroundImage).toContain("gradient");
    });

    it("caps itself with a brand-tinted top border", async () => {
      const style = await styleOf(".v-table-total-cell", { totalRow: makeTotalRow() });
      expect(style.borderTopWidth).toBe("2px");
    });

    it("sets it apart with weight", async () => {
      const style = await styleOf(".v-table-total-cell", { totalRow: makeTotalRow() });
      expect(Number.parseInt(style.fontWeight, 10)).toBeGreaterThanOrEqual(600);
    });
  });

  describe("highlight", () => {
    it("tints a pinned row once it is pinned", async () => {
      const el = await table({ highlight: true });
      const before = getComputedStyle(
        el.querySelector(".v-table-row-wrapper .v-table-cell") as HTMLElement,
      ).backgroundColor;

      (el.querySelector(".v-table-row-wrapper .v-table-pin-button") as HTMLElement).click();
      await nextTick();

      const after = getComputedStyle(
        el.querySelector(".v-table-row-wrapper--pinned .v-table-cell") as HTMLElement,
      ).backgroundColor;

      expect(after).not.toBe(before);
    });

    it("draws the pin button on the primary token when pinned", async () => {
      const el = await table({ highlight: true });
      const button = el.querySelector(".v-table-row-wrapper .v-table-pin-button") as HTMLElement;
      button.click();
      await nextTick();

      expect(getComputedStyle(button).color).toBe(tokenAsColor("--ui-primary-hover"));
      expect(getComputedStyle(button).borderTopColor).toBe(tokenAsColor("--ui-primary"));
    });
  });

  describe("empty state", () => {
    it("draws its title on the primary token", async () => {
      await applyTheme(theme);
      const screen = render(TableEmptyState, {
        props: { title: "Nothing here", description: "Adjust the filters." },
      });
      const title = screen.container.querySelector(".v-table-empty-state-title") as HTMLElement;

      expect(getComputedStyle(title).color).toBe(tokenAsColor("--ui-primary"));
    });

    it("draws its description on the secondary text token", async () => {
      await applyTheme(theme);
      const screen = render(TableEmptyState, { props: { description: "Adjust the filters." } });
      const description = screen.container
        .querySelector(".v-table-empty-state-description") as HTMLElement;

      expect(getComputedStyle(description).color)
        .toBe(tokenAsColor("--ui-foreground-secondary"));
    });
  });

  describe("pagination", () => {
    async function pagination(props: Record<string, unknown> = {}) {
      await applyTheme(theme);
      const screen = render(TablePagination, {
        props: { page: 2, pageSize: 10, total: 100, ...props },
      });
      return screen.container as HTMLElement;
    }

    it("separates the bar from the grid with a faded border token", async () => {
      const el = await pagination();
      const style = getComputedStyle(el.querySelector(".v-table-pagination") as HTMLElement);

      expect(style.borderTopWidth).toBe("1px");
      expect(style.borderTopColor).not.toBe("rgba(0, 0, 0, 0)");
      expect(style.borderTopColor).not.toBe(tokenAsColor("--ui-border-subtle"));
    });

    it("fills the current page's button with a brand gradient", async () => {
      const el = await pagination();
      const active = el.querySelector(".v-table-pagination-btn--active") as HTMLElement;
      const style = getComputedStyle(active);

      expect(style.backgroundImage).toContain(tokenAsColor("--ui-primary"));
      expect(style.backgroundImage).toContain(tokenAsColor("--ui-primary-hover"));
      expect(style.color).toBe(tokenAsColor("--ui-primary-foreground"));
      expect(style.borderTopColor).toBe(tokenAsColor("--ui-primary"));
    });

    it("keeps the brand colour off the other buttons", async () => {
      // They carry a gradient of their own, just a surface one — so the check
      // has to be for the absence of the brand tone, not of a gradient.
      const el = await pagination();
      const inactive = Array.from(el.querySelectorAll(".v-table-pagination-btn"))
        .find(b => !b.classList.contains("v-table-pagination-btn--active")) as HTMLElement;

      expect(getComputedStyle(inactive).backgroundImage)
        .not.toContain(tokenAsColor("--ui-primary"));
    });
  });

  describe("delta tones", () => {
    async function delta(props: Record<string, unknown>) {
      await applyTheme(theme);
      const screen = render(DeltaIndicator, { props });
      return screen.container.firstElementChild as HTMLElement;
    }

    it.each([
      ["positive", 5, "--ui-success"],
      ["negative", -5, "--ui-danger"],
    ] as [string, number, string][])("%s reads from %s", async (_name, value, token) => {
      expect(getComputedStyle(await delta({ value })).color).toBe(tokenAsColor(token));
    });

    it("leaves zero on the secondary text token", async () => {
      expect(getComputedStyle(await delta({ value: 0 })).color)
        .toBe(tokenAsColor("--ui-foreground-secondary"));
    });

    it("swaps the two tones when reversed", async () => {
      expect(getComputedStyle(await delta({ value: 5, reverse: true })).color)
        .toBe(tokenAsColor("--ui-danger"));
    });
  });
});

describe("table tokens — the two themes disagree", () => {
  /**
   * A dark override that never landed is invisible to every assertion above,
   * because each one only checks the token it resolves to in the theme it is
   * running in. These compare across themes instead.
   */
  async function surface(theme: "light" | "dark"): Promise<string> {
    await applyTheme(theme);
    const screen = render(VTable, {
      props: { columns: makeColumns(), data: makeRows(3), virtualized: false },
    });
    await nextTick();
    return getComputedStyle(screen.container.querySelector(".v-table-wrapper") as HTMLElement)
      .backgroundColor;
  }

  it("renders the wrapper on different surfaces per theme", async () => {
    expect(await surface("light")).not.toBe(await surface("dark"));
  });
});
