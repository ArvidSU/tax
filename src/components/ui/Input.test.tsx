import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../../test/test-utils";
import { Input, TextArea } from "./Input";

describe("Input", () => {
  it("should render input element", () => {
    renderWithProviders(<Input />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("should render with label", () => {
    renderWithProviders(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("should render with error message", () => {
    renderWithProviders(<Input error="Invalid email" />);
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
  });

  it("should add error class when error prop is provided", () => {
    renderWithProviders(<Input error="Error" />);
    expect(screen.getByRole("textbox")).toHaveClass("ui-input--error");
  });

  it("should not add error class when no error", () => {
    renderWithProviders(<Input />);
    expect(screen.getByRole("textbox")).not.toHaveClass("ui-input--error");
  });

  it("should call onChange when value changes", async () => {
    const handleChange = vi.fn();
    const { user } = renderWithProviders(<Input onChange={handleChange} />);

    await user.type(screen.getByRole("textbox"), "test");
    expect(handleChange).toHaveBeenCalled();
  });

  it("should accept custom id", () => {
    renderWithProviders(<Input id="custom-id" label="Name" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("id", "custom-id");
  });

  it("should generate id from label if not provided", () => {
    renderWithProviders(<Input label="First Name" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("id", "first-name");
  });

  it("should pass through HTML input attributes", () => {
    renderWithProviders(
      <Input
        type="email"
        placeholder="Enter email"
        required
        disabled
        maxLength={50}
      />
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("placeholder", "Enter email");
    expect(input).toHaveAttribute("maxLength", "50");
  });

  it("should accept custom className", () => {
    renderWithProviders(<Input className="custom-input" />);
    expect(screen.getByRole("textbox")).toHaveClass("custom-input");
  });

  it("should have base input class", () => {
    renderWithProviders(<Input />);
    expect(screen.getByRole("textbox")).toHaveClass("ui-input");
  });

  it("should be disabled when disabled prop is true", () => {
    renderWithProviders(<Input disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("should render value correctly", () => {
    renderWithProviders(<Input value="test value" onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("test value");
  });
});

describe("TextArea", () => {
  it("should render textarea element", () => {
    renderWithProviders(<TextArea />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("should render with label", () => {
    renderWithProviders(<TextArea label="Description" />);
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });

  it("should render with error message", () => {
    renderWithProviders(<TextArea error="Required field" />);
    expect(screen.getByText("Required field")).toBeInTheDocument();
  });

  it("should add error class when error prop is provided", () => {
    renderWithProviders(<TextArea error="Error" />);
    expect(screen.getByRole("textbox")).toHaveClass("ui-input--error");
  });

  it("should have textarea-specific class", () => {
    renderWithProviders(<TextArea />);
    expect(screen.getByRole("textbox")).toHaveClass("ui-input--textarea");
  });

  it("should call onChange when value changes", async () => {
    const handleChange = vi.fn();
    const { user } = renderWithProviders(<TextArea onChange={handleChange} />);

    await user.type(screen.getByRole("textbox"), "test content");
    expect(handleChange).toHaveBeenCalled();
  });

  it("should accept custom id", () => {
    renderWithProviders(<TextArea id="custom-textarea" label="Bio" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("id", "custom-textarea");
  });

  it("should generate id from label if not provided", () => {
    renderWithProviders(<TextArea label="About Me" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("id", "about-me");
  });

  it("should pass through HTML textarea attributes", () => {
    renderWithProviders(
      <TextArea
        placeholder="Enter description"
        required
        disabled
        rows={5}
      />
    );
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("placeholder", "Enter description");
    expect(textarea).toHaveAttribute("rows", "5");
  });

  it("should accept custom className", () => {
    renderWithProviders(<TextArea className="custom-textarea" />);
    expect(screen.getByRole("textbox")).toHaveClass("custom-textarea");
  });

  it("should be disabled when disabled prop is true", () => {
    renderWithProviders(<TextArea disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("should render value correctly", () => {
    renderWithProviders(<TextArea value="test content" onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("test content");
  });

  it("should allow multiline text", async () => {
    const handleChange = vi.fn();
    const { user } = renderWithProviders(<TextArea onChange={handleChange} />);

    await user.type(screen.getByRole("textbox"), "Line 1");
    expect(screen.getByRole("textbox")).toHaveValue("Line 1");
  });
});
