import type { Conversation, Message } from "../types/index.ts";
import { MessageStatus } from "../types/index.ts";

interface SqlStatement {
  sql: string;
  params: unknown[];
}

const CONVERSATION_INSERT_COLUMNS = [
  "id",
  "title",
  "modelId",
  "reasoningEffort",
  "lastMessage",
  "lastMessageAt",
  "pinned",
  "createdAt",
  "updatedAt",
  "workspaceDir",
] as const;

const MESSAGE_INSERT_COLUMNS = [
  "id",
  "conversationId",
  "role",
  "senderModelId",
  "senderName",
  "content",
  "images",
  "generatedImages",
  "reasoningContent",
  "reasoningDuration",
  "toolCalls",
  "toolResults",
  "branchId",
  "parentMessageId",
  "isStreaming",
  "status",
  "errorMessage",
  "tokenUsage",
  "createdAt",
] as const;

function buildInsertSql(table: string, columns: readonly string[]): string {
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;
}

export function getConversationTableDefinition(): string {
  return `
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      modelId TEXT,
      reasoningEffort TEXT,
      lastMessage TEXT,
      lastMessageAt TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      workspaceDir TEXT
    )
  `;
}

export function buildConversationInsertStatement(conversation: Conversation): SqlStatement {
  return {
    sql: buildInsertSql("conversations", CONVERSATION_INSERT_COLUMNS),
    params: [
      conversation.id,
      conversation.title,
      conversation.modelId,
      conversation.reasoningEffort ?? null,
      conversation.lastMessage,
      conversation.lastMessageAt,
      conversation.pinned ? 1 : 0,
      conversation.createdAt,
      conversation.updatedAt,
      conversation.workspaceDir ?? null,
    ],
  };
}

export function getMessageTableDefinition(): string {
  return `
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL,
      role TEXT NOT NULL,
      senderModelId TEXT,
      senderName TEXT,
      content TEXT NOT NULL DEFAULT '',
      images TEXT NOT NULL DEFAULT '[]',
      generatedImages TEXT NOT NULL DEFAULT '[]',
      reasoningContent TEXT,
      reasoningDuration REAL,
      toolCalls TEXT NOT NULL DEFAULT '[]',
      toolResults TEXT NOT NULL DEFAULT '[]',
      branchId TEXT,
      parentMessageId TEXT,
      isStreaming INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'success',
      errorMessage TEXT,
      tokenUsage TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `;
}

export function buildMessageInsertStatement(message: Message): SqlStatement {
  return {
    sql: buildInsertSql("messages", MESSAGE_INSERT_COLUMNS),
    params: [
      message.id,
      message.conversationId,
      message.role,
      message.senderModelId,
      message.senderName,
      message.content,
      JSON.stringify(message.images ?? []),
      JSON.stringify(message.generatedImages ?? []),
      message.reasoningContent,
      message.reasoningDuration,
      JSON.stringify(message.toolCalls),
      JSON.stringify(message.toolResults),
      message.branchId,
      message.parentMessageId,
      message.isStreaming ? 1 : 0,
      message.status ?? MessageStatus.SUCCESS,
      message.errorMessage ?? null,
      message.tokenUsage ? JSON.stringify(message.tokenUsage) : null,
      message.createdAt,
    ],
  };
}
