export type SingleReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | undefined;

export interface LegacyConversationParticipant {
  id?: string;
  modelId?: string | null;
  reasoningEffort?: SingleReasoningEffort;
}

export interface SingleConversationShape {
  id: string;
  title: string;
  modelId: string;
  reasoningEffort?: SingleReasoningEffort;
  lastMessage: string | null;
  lastMessageAt: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  workspaceDir?: string;
}

export interface LegacyConversationShape {
  id: string;
  title?: string | null;
  modelId?: string | null;
  reasoningEffort?: SingleReasoningEffort;
  participants?: LegacyConversationParticipant[] | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  pinned?: boolean;
  createdAt?: string;
  updatedAt?: string;
  workspaceDir?: string | null;
}

export interface CreateSingleConversationDraftInput {
  id: string;
  modelId: string;
  title: string;
  reasoningEffort?: SingleReasoningEffort;
  now: string;
  workspaceDir?: string;
}

function getPrimaryParticipant(
  conversation: LegacyConversationShape,
): LegacyConversationParticipant | null {
  return conversation.participants?.[0] ?? null;
}

export function coerceConversationToSingle(
  conversation: LegacyConversationShape,
): SingleConversationShape {
  const primaryParticipant = getPrimaryParticipant(conversation);

  return {
    id: conversation.id,
    title: conversation.title ?? "",
    modelId: conversation.modelId ?? primaryParticipant?.modelId ?? "",
    reasoningEffort: conversation.reasoningEffort ?? primaryParticipant?.reasoningEffort,
    lastMessage: conversation.lastMessage ?? null,
    lastMessageAt: conversation.lastMessageAt ?? null,
    pinned: conversation.pinned ?? false,
    createdAt: conversation.createdAt ?? new Date(0).toISOString(),
    updatedAt: conversation.updatedAt ?? conversation.createdAt ?? new Date(0).toISOString(),
    workspaceDir: conversation.workspaceDir ?? undefined,
  };
}

export function createSingleConversationDraft(
  input: CreateSingleConversationDraftInput,
): SingleConversationShape {
  const conversation: SingleConversationShape = {
    id: input.id,
    title: input.title,
    modelId: input.modelId,
    reasoningEffort: input.reasoningEffort,
    lastMessage: null,
    lastMessageAt: null,
    pinned: false,
    createdAt: input.now,
    updatedAt: input.now,
  };
  if (input.workspaceDir) {
    conversation.workspaceDir = input.workspaceDir;
  }
  return conversation;
}
