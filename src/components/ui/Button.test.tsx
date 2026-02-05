import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../../test/test-utils";
import { Button } from "./Button";

describe("Button", () => {
  it("should render children", () => {
    renderWithProviders(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("should render with primary variant", () => {
    renderWithProviders(<Button variant="primary">Primary</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("ui-button--primary");
  });

  it("should render with secondary variant by default", () => {
    renderWithProviders(<Button>Default</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("ui-button--secondary");
  });

  it("should render with ghost variant", () => {
    renderWithProviders(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("ui-button--ghost");
  });

  it("should render with danger variant", () => {
    renderWithProviders(<Button variant="danger">Danger</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("ui-button--danger");
  });

  it("should render with small size", () => {
    renderWithProviders(<Button size="sm">Small</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("ui-button--sm");
  });

  it("should render with medium size by default", () => {
    renderWithProviders(<Button>Medium</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("ui-button--md");
  });

  it("should render with large size", () => {
    renderWithProviders(<Button size="lg">Large</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("ui-button--lg");
  });

  it("should be disabled when disabled prop is true", () => {
    renderWithProviders(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should show spinner when isLoading is true", () => {
    renderWithProviders(<Button isLoading>Loading</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("ui-button--loading");
    expect(button.querySelector(".ui-button__spinner")).toBeInTheDocument();
  });

  it("should be disabled when isLoading is true", () => {
    renderWithProviders(<Button isLoading>Loading</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should call onClick when clicked", async () => {
    const handleClick = vi.fn();
    const { user } = renderWithProviders(
      <Button onClick={handleClick}>Click me</Button>
    );

    await user.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should not call onClick when disabled", async () => {
    const handleClick = vi.fn();
    const { user } = renderWithProviders(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    );

    await user.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should not call onClick when loading", async () => {
    const handleClick = vi.fn();
    const { user } = renderWithProviders(
      <Button onClick={handleClick} isLoading>
        Loading
      </Button>
    );

    await user.click(screen.getByRole("button"));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should accept custom className", () => {
    renderWithProviders(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("should pass through other HTML button attributes", () => {
    renderWithProviders(
      <Button type="submit" form="test-form" name="test-button">
        Submit
      </Button>
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("form", "test-form");
    expect(button).toHaveAttribute("name", "test-button");
  });

  it("should have correct base classes", () => {
    renderWithProviders(<Button>Base</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("ui-button");
    expect(button).toHaveClass("ui-button--secondary");
    expect(button).toHaveClass("ui-button--md");
  });
});
