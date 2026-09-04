/**
 * 跨 Tab 会话导航：历史列表页选定会话后，
 * 把 { sessionId, title } 交给聊天页在下次聚焦时消费。
 */

export interface PendingSession {
  sessionId: string;
  title: string | null;
}

let pending: PendingSession | null = null;

export function setPendingSession(session: PendingSession | null) {
  pending = session;
}

export function takePendingSession(): PendingSession | null {
  const session = pending;
  pending = null;
  return session;
}
