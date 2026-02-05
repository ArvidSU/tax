import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth, normalizeEmail, isValidEmail } from "./useAuth";

// Mock Convex hooks
const mockLoginMutation = vi.fn();
const mockRegisterMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: vi.fn((apiPath: string) => {
    if (apiPath === "login") return mockLoginMutation;
    if (apiPath === "register") return mockRegisterMutation;
    return vi.fn();
  }),
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    users: {
      login: "login",
      register: "register",
    },
  },
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoginMutation.mockResolvedValue("user-123");
    mockRegisterMutation.mockResolvedValue("user-456");
  });

  describe("initialization", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.mode).toBe("login");
      expect(result.current.name).toBe("");
      expect(result.current.email).toBe("");
      expect(result.current.secret).toBe("");
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("state setters", () => {
    it("should update mode", () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setMode("register");
      });

      expect(result.current.mode).toBe("register");
    });

    it("should update name", () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setName("John Doe");
      });

      expect(result.current.name).toBe("John Doe");
    });

    it("should update email", () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setEmail("john@example.com");
      });

      expect(result.current.email).toBe("john@example.com");
    });

    it("should update secret", () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setSecret("password123");
      });

      expect(result.current.secret).toBe("password123");
    });

    it("should clear error state", () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setEmail("invalid");
        result.current.setSecret("password");
      });

      // Validation should set error
      expect(result.current.error).toBeNull();
      
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("login", () => {
    it("should reject invalid email", async () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setEmail("invalid-email");
        result.current.setSecret("password123");
      });

      let userId: string | null = null;
      await act(async () => {
        userId = await result.current.login();
      });

      expect(userId).toBeNull();
      expect(result.current.error).toBe("Please enter a valid email address");
      expect(mockLoginMutation).not.toHaveBeenCalled();
    });

    it("should reject empty secret", async () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setEmail("john@example.com");
        result.current.setSecret("");
      });

      let userId: string | null = null;
      await act(async () => {
        userId = await result.current.login();
      });

      expect(userId).toBeNull();
      expect(result.current.error).toBe("Secret is required");
    });
  });

  describe("register", () => {
    it("should reject empty name in register mode", async () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setMode("register");
        result.current.setName("");
        result.current.setEmail("john@example.com");
        result.current.setSecret("password123");
      });

      let userId: string | null = null;
      await act(async () => {
        userId = await result.current.register();
      });

      expect(userId).toBeNull();
      expect(result.current.error).toBe("Name is required");
    });
  });
});

describe("normalizeEmail", () => {
  it("should convert to lowercase", () => {
    expect(normalizeEmail("JOHN@EXAMPLE.COM")).toBe("john@example.com");
  });

  it("should trim whitespace", () => {
    expect(normalizeEmail("  john@example.com  ")).toBe("john@example.com");
  });

  it("should handle both uppercase and whitespace", () => {
    expect(normalizeEmail("  JOHN@EXAMPLE.COM  ")).toBe("john@example.com");
  });
});

describe("isValidEmail", () => {
  it("should accept valid email addresses", () => {
    expect(isValidEmail("john@example.com")).toBe(true);
    expect(isValidEmail("user.name@domain.co.uk")).toBe(true);
    expect(isValidEmail("user+tag@example.org")).toBe(true);
  });

  it("should reject invalid email addresses", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("john@")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("should reject emails with spaces", () => {
    expect(isValidEmail("john @example.com")).toBe(false);
    expect(isValidEmail("john@ example.com")).toBe(false);
  });
});
