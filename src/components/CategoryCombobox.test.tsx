import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryCombobox } from "./CategoryCombobox";

describe("CategoryCombobox", () => {
  it("passes description when creating a category", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <CategoryCombobox
        categories={[]}
        parentId={null}
        onSelect={vi.fn()}
        onCreate={onCreate}
      />
    );

    await user.type(
      screen.getByPlaceholderText("Search or create category..."),
      "Transportation"
    );
    await user.type(
      screen.getByLabelText("Description (optional)"),
      "Roads and transit programs"
    );
    await user.click(screen.getByText("Create “Transportation”"));

    expect(onCreate).toHaveBeenCalledWith(
      "Transportation",
      null,
      "Roads and transit programs"
    );
  });

  it("creates with undefined description when empty", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <CategoryCombobox
        categories={[]}
        parentId={"root-1"}
        onSelect={vi.fn()}
        onCreate={onCreate}
      />
    );

    await user.type(
      screen.getByPlaceholderText("Search or create category..."),
      "Medicare"
    );
    await user.click(screen.getByText("Create “Medicare”"));

    expect(onCreate).toHaveBeenCalledWith("Medicare", "root-1", undefined);
  });
});
