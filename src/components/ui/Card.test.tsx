import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/test-utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./Card";

describe("Card", () => {
  it("should render children", () => {
    renderWithProviders(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("should render with default variant", () => {
    const { container } = renderWithProviders(<Card>Default</Card>);
    const card = container.querySelector(".ui-card");
    expect(card).toHaveClass("ui-card--default");
  });

  it("should render with elevated variant", () => {
    const { container } = renderWithProviders(<Card variant="elevated">Elevated</Card>);
    const card = container.querySelector(".ui-card");
    expect(card).toHaveClass("ui-card--elevated");
  });

  it("should render with bordered variant", () => {
    const { container } = renderWithProviders(<Card variant="bordered">Bordered</Card>);
    const card = container.querySelector(".ui-card");
    expect(card).toHaveClass("ui-card--bordered");
  });

  it("should accept custom className", () => {
    const { container } = renderWithProviders(<Card className="custom-card">Custom</Card>);
    const card = container.querySelector(".ui-card");
    expect(card).toHaveClass("custom-card");
  });
});

describe("CardHeader", () => {
  it("should render children", () => {
    renderWithProviders(
      <Card>
        <CardHeader>Header content</CardHeader>
      </Card>
    );
    expect(screen.getByText("Header content")).toBeInTheDocument();
  });

  it("should have header class", () => {
    renderWithProviders(
      <Card>
        <CardHeader>Header</CardHeader>
      </Card>
    );
    expect(screen.getByText("Header")).toHaveClass("ui-card__header");
  });
});

describe("CardTitle", () => {
  it("should render as h3", () => {
    renderWithProviders(
      <Card>
        <CardTitle>Card Title</CardTitle>
      </Card>
    );
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Card Title");
  });

  it("should have title class", () => {
    renderWithProviders(
      <Card>
        <CardTitle>Title</CardTitle>
      </Card>
    );
    expect(screen.getByRole("heading")).toHaveClass("ui-card__title");
  });
});

describe("CardDescription", () => {
  it("should render as paragraph", () => {
    renderWithProviders(
      <Card>
        <CardDescription>Description text</CardDescription>
      </Card>
    );
    const description = screen.getByText("Description text");
    expect(description.tagName.toLowerCase()).toBe("p");
  });

  it("should have description class", () => {
    renderWithProviders(
      <Card>
        <CardDescription>Desc</CardDescription>
      </Card>
    );
    expect(screen.getByText("Desc")).toHaveClass("ui-card__description");
  });
});

describe("CardContent", () => {
  it("should render children", () => {
    renderWithProviders(
      <Card>
        <CardContent>Main content</CardContent>
      </Card>
    );
    expect(screen.getByText("Main content")).toBeInTheDocument();
  });

  it("should have content class", () => {
    renderWithProviders(
      <Card>
        <CardContent>Content</CardContent>
      </Card>
    );
    expect(screen.getByText("Content")).toHaveClass("ui-card__content");
  });
});

describe("CardFooter", () => {
  it("should render children", () => {
    renderWithProviders(
      <Card>
        <CardFooter>Footer content</CardFooter>
      </Card>
    );
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });

  it("should have footer class", () => {
    renderWithProviders(
      <Card>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    expect(screen.getByText("Footer")).toHaveClass("ui-card__footer");
  });
});

describe("Card composition", () => {
  it("should render complete card with all subcomponents", () => {
    renderWithProviders(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description</CardDescription>
        </CardHeader>
        <CardContent>Main content goes here</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>
    );

    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Card description")).toBeInTheDocument();
    expect(screen.getByText("Main content goes here")).toBeInTheDocument();
    expect(screen.getByText("Footer actions")).toBeInTheDocument();
  });
});
