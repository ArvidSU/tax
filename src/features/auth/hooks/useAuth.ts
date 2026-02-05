import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";


const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export interface UseAuthReturn {
  mode: "login" | "register";
  name: string;
  email: string;
  secret: string;
  error: string | null;
  isLoading: boolean;
  setMode: (mode: "login" | "register") => void;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setSecret: (secret: string) => void;
  login: () => Promise<string | null>;
  register: () => Promise<string | null>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = useMutation(api.users.login);
  const registerMutation = useMutation(api.users.register);

  const clearError = useCallback(() => setError(null), []);

  const validateInputs = useCallback((): boolean => {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (mode === "register" && !name.trim()) {
      setError("Name is required");
      return false;
    }
    if (!secret) {
      setError("Secret is required");
      return false;
    }
    return true;
  }, [email, name, secret, mode]);

  const login = useCallback(async (): Promise<string | null> => {
    setError(null);
    if (!validateInputs()) return null;

    setIsLoading(true);
    try {
      const id = await loginMutation({
        email: normalizeEmail(email),
        secret,
      });
      return id as string;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [email, secret, loginMutation, validateInputs]);

  const register = useCallback(async (): Promise<string | null> => {
    setError(null);
    if (!validateInputs()) return null;

    setIsLoading(true);
    try {
      const id = await registerMutation({
        name: name.trim(),
        email: normalizeEmail(email),
        secret,
      });
      return id as string;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [name, email, secret, registerMutation, validateInputs]);

  return {
    mode,
    name,
    email,
    secret,
    error,
    isLoading,
    setMode,
    setName,
    setEmail,
    setSecret,
    login,
    register,
    clearError,
  };
}

export { normalizeEmail, isValidEmail };
