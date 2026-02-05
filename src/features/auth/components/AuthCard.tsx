import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Card, CardContent } from "../../../components/ui/Card";
import type { UseAuthReturn } from "../hooks/useAuth";
import "./AuthCard.css";

interface AuthCardProps {
  auth: UseAuthReturn;
  onSuccess: (userId: string) => void;
}

export function AuthCard({ auth, onSuccess }: AuthCardProps) {
  const handleSubmit = async () => {
    const userId = auth.mode === "register" 
      ? await auth.register() 
      : await auth.login();
    if (userId) {
      onSuccess(userId);
    }
  };

  return (
    <div className="auth-container">
      <Card variant="elevated" className="auth-card">
        <CardContent>
          <div className="auth-header">
            <h1>Allocation Boards</h1>
            <p>Sign in to create a board and allocate categories.</p>
          </div>

          <div className="auth-toggle">
            <button
              className={auth.mode === "login" ? "active" : ""}
              onClick={() => auth.setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={auth.mode === "register" ? "active" : ""}
              onClick={() => auth.setMode("register")}
              type="button"
            >
              Register
            </button>
          </div>

          {auth.mode === "register" && (
            <Input
              label="Name"
              type="text"
              value={auth.name}
              onChange={(e) => auth.setName(e.target.value)}
            />
          )}

          <Input
            label="Email"
            type="email"
            value={auth.email}
            onChange={(e) => auth.setEmail(e.target.value)}
          />

          <Input
            label="Secret"
            type="password"
            value={auth.secret}
            onChange={(e) => auth.setSecret(e.target.value)}
          />

          {auth.error && <div className="auth-error">{auth.error}</div>}

          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={auth.isLoading}
            className="auth-submit"
          >
            {auth.mode === "register" ? "Create account" : "Login"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
