/**
 * Chat message building utilities for single-chat conversations.
 */
import type { Message, Conversation } from "../types";
import { MessageStatus } from "../types";
import { useProviderStore } from "./provider-store";

export function getConversationModelLabel(conversation: Conversation): string {
  const model = useProviderStore.getState().getModelById(conversation.modelId);
  return model?.displayName ?? conversation.modelId;
}

export function buildApiMessagesForConversation(
  allMessages: Message[],
  conversation: Conversation,
  options?: {
    workspaceTree?: string;
    workspaceFiles?: Array<{ path: string; content: string }>;
  },
): Array<{ role: string; content: unknown; tool_calls?: unknown; tool_call_id?: string }> {
  const model = useProviderStore.getState().getModelById(conversation.modelId);
  const supportsVision = !!model?.capabilities?.vision;
  const apiMessages: Array<{ role: string; content: unknown }> = [];

  const workspaceDir = conversation.workspaceDir;
  let workspaceHint = "";
  if (workspaceDir) {
    workspaceHint = "The user attached a local workspace to this conversation.";
    workspaceHint +=
      '\nWhen you want to create or write files, wrap each file in <file path="relative/path.ext">content</file> tags. The path must be relative to the workspace root.';
    if (options?.workspaceTree) {
      workspaceHint += `\n\nCurrent workspace tree:\n${options.workspaceTree}`;
    }
    if (options?.workspaceFiles?.length) {
      workspaceHint += "\n\nLoaded workspace files:";
      for (const file of options.workspaceFiles) {
        workspaceHint += `\n\n--- FILE: ${file.path} ---\n${file.content}`;
      }
    }
    workspaceHint +=
      "\n\nYou have workspace tools available:" +
      "\n- `read_workspace_file`: Read a text file by relative path." +
      "\n- `list_workspace_dir`: List files in a directory (omit path for root)." +
      "\n- `search_workspace`: Search for a text pattern across all files." +
      "\n- `edit_workspace_file`: Edit a file using search/replace (provide path, old_content, new_content)." +
      "\n- `git_status`: Check git status (modified/staged/untracked files)." +
      "\n- `git_diff`: Show file changes." +
      "\n- `git_log`: Show recent commit history.";
  }

  if (workspaceHint) {
    apiMessages.push({ role: "system", content: workspaceHint });
  }

  for (const message of allMessages) {
    if (message.role !== "user" && message.role !== "assistant") continue;

    let content: unknown = message.content;
    if (message.role === "user" && message.images.length > 0) {
      if (supportsVision) {
        const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
        if (message.content) {
          parts.push({ type: "text", text: message.content });
        }
        for (const uri of message.images) {
          parts.push({ type: "image_url", image_url: { url: uri } });
        }
        content = parts;
      } else {
        const imageOmittedNotice =
          "[User attached image(s), but they were omitted because this model does not support image input.]";
        content = message.content?.trim()
          ? `${message.content}\n\n${imageOmittedNotice}`
          : imageOmittedNotice;
      }
    }

    apiMessages.push({ role: message.role, content });
  }

  return apiMessages;
}

export function createUserMessage(
  id: string,
  conversationId: string,
  text: string,
  images: string[],
  branchId: string | null,
): Message {
  return {
    id,
    conversationId,
    role: "user",
    senderModelId: null,
    senderName: "You",
    content: text,
    images,
    generatedImages: [],
    reasoningContent: null,
    reasoningDuration: null,
    toolCalls: [],
    toolResults: [],
    branchId,
    parentMessageId: null,
    isStreaming: false,
    status: MessageStatus.SUCCESS,
    errorMessage: null,
    tokenUsage: null,
    createdAt: new Date().toISOString(),
  };
}

export function createAssistantMessage(
  id: string,
  conversationId: string,
  modelId: string,
  senderName: string,
  branchId: string | null,
  createdAt: string,
): Message {
  return {
    id,
    conversationId,
    role: "assistant",
    senderModelId: modelId,
    senderName,
    content: "",
    images: [],
    generatedImages: [],
    reasoningContent: null,
    reasoningDuration: null,
    toolCalls: [],
    toolResults: [],
    branchId,
    parentMessageId: null,
    isStreaming: true,
    status: MessageStatus.STREAMING,
    errorMessage: null,
    tokenUsage: null,
    createdAt,
  };
}
