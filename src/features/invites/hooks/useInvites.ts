import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Invite } from "../../../types";
import { isValidEmail } from "../../auth/hooks/useAuth";

interface UseInvitesProps {
  userId: string | null;
  boardId: string | null;
  userEmail: string | undefined;
  isBoardAdmin: boolean;
}

interface UseInvitesReturn {
  invitesForUser: Invite[] | undefined;
  boardInvites: Invite[] | undefined;
  inviteCount: number;
  sendInvite: (email: string, role: "viewer" | "participant") => Promise<void>;
  revokeInvite: (inviteId: string) => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  sendError: string | null;
  actionError: string | null;
  clearErrors: () => void;
}

export function useInvites({
  userId,
  boardId,
  userEmail,
  isBoardAdmin,
}: UseInvitesProps): UseInvitesReturn {
  const [sendError, setSendError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const invitesForUser = useQuery(
    api.invites.listForUser,
    userEmail ? { email: userEmail } : "skip"
  );

  const boardInvites = useQuery(
    api.invites.listForBoard,
    boardId && userId && isBoardAdmin
      ? {
          boardId: boardId as Id<"boards">,
          userId: userId as Id<"users">,
        }
      : "skip"
  );

  const createInviteMutation = useMutation(api.invites.create);
  const revokeInviteMutation = useMutation(api.invites.revoke);
  const acceptInviteMutation = useMutation(api.invites.accept);
  const declineInviteMutation = useMutation(api.invites.decline);

  const inviteCount = invitesForUser?.length ?? 0;

  const sendInvite = useCallback(
    async (email: string, role: "viewer" | "participant"): Promise<void> => {
      if (!boardId || !userId) return;
      setSendError(null);

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setSendError("Email is required");
        return;
      }
      if (!isValidEmail(normalizedEmail)) {
        setSendError("Please enter a valid email address");
        return;
      }

      try {
        await createInviteMutation({
          boardId: boardId as Id<"boards">,
          email: normalizedEmail,
          invitedBy: userId as Id<"users">,
          role,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to send invite";
        setSendError(message);
      }
    },
    [boardId, userId, createInviteMutation]
  );

  const revokeInvite = useCallback(
    async (inviteId: string): Promise<void> => {
      if (!userId) return;
      await revokeInviteMutation({
        inviteId: inviteId as Id<"boardInvites">,
        userId: userId as Id<"users">,
      });
    },
    [revokeInviteMutation, userId]
  );

  const acceptInvite = useCallback(
    async (inviteId: string): Promise<void> => {
      if (!userId) return;
      setActionError(null);
      try {
        await acceptInviteMutation({
          inviteId: inviteId as Id<"boardInvites">,
          userId: userId as Id<"users">,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to accept invite";
        setActionError(message);
      }
    },
    [acceptInviteMutation, userId]
  );

  const declineInvite = useCallback(
    async (inviteId: string): Promise<void> => {
      if (!userId) return;
      setActionError(null);
      try {
        await declineInviteMutation({
          inviteId: inviteId as Id<"boardInvites">,
          userId: userId as Id<"users">,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to decline invite";
        setActionError(message);
      }
    },
    [declineInviteMutation, userId]
  );

  const clearErrors = useCallback(() => {
    setSendError(null);
    setActionError(null);
  }, []);

  return {
    invitesForUser: invitesForUser as Invite[] | undefined,
    boardInvites: boardInvites as Invite[] | undefined,
    inviteCount,
    sendInvite,
    revokeInvite,
    acceptInvite,
    declineInvite,
    sendError,
    actionError,
    clearErrors,
  };
}

export type { UseInvitesReturn };
