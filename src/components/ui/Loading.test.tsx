import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/test-utils";
import { Loading, Skeleton } from "./Loading";

describe("Loading", () => {
  it("should render spinner", () => {
    renderWithProviders(<Loading />);
    expect(document.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("should render with message", () => {
    renderWithProviders(<Loading message="Loading data..." />);
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
  });

  it("should render small size", () => {
    const { container } = renderWithProviders(<Loading size="sm" />);
    const spinner = container.querySelector(".loading-spinner");
    expect(spinner).toHaveClass("loading-spinner--sm");
  });

  it("should render medium size by default", () => {
    const { container } = renderWithProviders(<Loading />);
    const spinner = container.querySelector(".loading-spinner");
    expect(spinner).toHaveClass("loading-spinner--md");
  });

  it("should render large size", () => {
    const { container } = renderWithProviders(<Loading size="lg" />);
    const spinner = container.querySelector(".loading-spinner");
    expect(spinner).toHaveClass("loading-spinner--lg");
  });

  it("should render in fullscreen mode", () => {
    const { container } = renderWithProviders(<Loading fullScreen />);
    expect(container.querySelector(".app-loading")).toBeInTheDocument();
  });

  it("should render in container mode when not fullscreen", () => {
    const { container } = renderWithProviders(<Loading />);
    expect(container.querySelector(".loading-container")).toBeInTheDocument();
  });

  it("should render message with correct class", () => {
    renderWithProviders(<Loading message="Test" />);
    expect(screen.getByText("Test")).toHaveClass("loading-message");
  });
});

describe("Skeleton", () => {
  it("should render skeleton element", () => {
    const { container } = renderWithProviders(<Skeleton />);
    expect(container.querySelector(".skeleton")).toBeInTheDocument();
  });

  it("should accept custom className", () => {
    const { container } = renderWithProviders(<Skeleton className="custom-skeleton" />);
    const skeleton = container.querySelector(".skeleton");
    expect(skeleton).toHaveClass("custom-skeleton");
  });

  it("should accept numeric width", () => {
    const { container } = renderWithProviders(<Skeleton width={200} />);
    const skeleton = container.querySelector(".skeleton");
    expect(skeleton).toHaveStyle("width: 200px");
  });

  it("should accept string width", () => {
    const { container } = renderWithProviders(<Skeleton width="50%" />);
    const skeleton = container.querySelector(".skeleton");
    expect(skeleton).toHaveStyle("width: 50%");
  });

  it("should accept numeric height", () => {
    const { container } = renderWithProviders(<Skeleton height={100} />);
    const skeleton = container.querySelector(".skeleton");
    expect(skeleton).toHaveStyle("height: 100px");
  });

  it("should accept string height", () => {
    const { container } = renderWithProviders(<Skeleton height="2rem" />);
    const skeleton = container.querySelector(".skeleton");
    expect(skeleton).toHaveStyle("height: 2rem");
  });

  it("should accept both width and height", () => {
    const { container } = renderWithProviders(<Skeleton width={300} height={150} />);
    const skeleton = container.querySelector(".skeleton");
    expect(skeleton).toHaveStyle("width: 300px");
    expect(skeleton).toHaveStyle("height: 150px");
  });
});
