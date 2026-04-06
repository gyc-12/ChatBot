import type { Conversation } from "../types";

export interface ConversationSection {
  id: "pinned" | "today" | "previous_7_days" | "older";
  label: string;
  items: Conversation[];
}

export function buildConversationSections(
  conversations: Conversation[],
  labels: Record<ConversationSection["id"], string>,
  now = new Date(),
): ConversationSection[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

  const sorted = [...conversations].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
  const pinned = sorted.filter((item) => item.pinned);
  const unpinned = sorted.filter((item) => !item.pinned);

  const sections: ConversationSection[] = [
    { id: "pinned", label: labels.pinned, items: pinned },
    {
      id: "today",
      label: labels.today,
      items: unpinned.filter((item) => new Date(item.updatedAt).getTime() >= startOfToday),
    },
    {
      id: "previous_7_days",
      label: labels.previous_7_days,
      items: unpinned.filter((item) => {
        const updatedAt = new Date(item.updatedAt).getTime();
        return updatedAt < startOfToday && updatedAt >= sevenDaysAgo;
      }),
    },
    {
      id: "older",
      label: labels.older,
      items: unpinned.filter((item) => new Date(item.updatedAt).getTime() < sevenDaysAgo),
    },
  ];

  return sections.filter((section) => section.items.length > 0);
}
