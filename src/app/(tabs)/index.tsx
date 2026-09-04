import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as agentApi from '@/api/agentApi';
import type { HistoryMessage } from '@/api/types';
import { MarkdownText } from '@/components/markdown-text';
import { useTheme } from '@/hooks/use-theme';
import { takePendingSession } from '@/stores/chatBus';

interface UiMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  reasoning: string;
  done: boolean;
  error?: string;
}

let messageSeq = 1;
const nextId = () => messageSeq++;

function toUiMessages(history: HistoryMessage[]): UiMessage[] {
  return history.map((item) => ({
    id: nextId(),
    role: item.role,
    content: item.content,
    reasoning: '',
    done: true,
  }));
}

export default function ChatScreen() {
  const theme = useTheme();

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [sessionTitle, setSessionTitle] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showReasoningId, setShowReasoningId] = useState<number | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const streamRef = useRef<{ abort: () => void } | null>(null);

  const patchMessage = useCallback(
    (id: number, updater: (message: UiMessage) => UiMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
    },
    [],
  );

  const stopStreaming = useCallback(() => {
    streamRef.current?.abort();
    streamRef.current = null;
    setStreaming(false);
  }, []);

  const clearConversation = useCallback(() => {
    stopStreaming();
    setMessages([]);
    setSessionId(undefined);
    setSessionTitle(null);
  }, [stopStreaming]);

  const loadSession = useCallback(
    (sid: string, title: string | null) => {
      stopStreaming();
      setLoadingHistory(true);
      setSessionId(sid);
      setSessionTitle(title);
      setMessages([]);
      agentApi
        .getHistory(sid)
        .then((result) => setMessages(toUiMessages(result.messages)))
        .catch((error) =>
          Alert.alert('加载失败', error instanceof Error ? error.message : '请稍后重试'),
        )
        .finally(() => setLoadingHistory(false));
    },
    [stopStreaming],
  );

  // 历史页跳转：聚焦时消费待打开的会话
  useFocusEffect(
    useCallback(() => {
      const pending = takePendingSession();
      if (pending && pending.sessionId !== sessionId) {
        loadSession(pending.sessionId, pending.title);
      }
    }, [loadSession, sessionId]),
  );

  const sendMessage = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    stopStreaming();

    const userMsg: UiMessage = {
      id: nextId(),
      role: 'user',
      content: text,
      reasoning: '',
      done: true,
    };
    const assistantMsg: UiMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      reasoning: '',
      done: false,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setBusy(true);
    setStreaming(true);

    let firstChunk = true;
    const handle = agentApi.streamChat(
      text,
      sessionId,
      {
        onEvent: (event) => {
          if (event.type === 'session' && event.sessionId) {
            setSessionId(event.sessionId);
            return;
          }
          if (event.type === 'text') {
            if (firstChunk && !event.content) return;
            patchMessage(assistantMsg.id, (m) => ({
              ...m,
              content: m.content + (event.content ?? ''),
            }));
            firstChunk = false;
          } else if (event.type === 'reasoning') {
            patchMessage(assistantMsg.id, (m) => ({
              ...m,
              reasoning: m.reasoning + (event.content ?? ''),
            }));
          } else if (event.type === 'error') {
            patchMessage(assistantMsg.id, (m) => ({
              ...m,
              content: m.content + `\n\n[出错] ${event.message ?? '服务暂时不可用'}`,
              done: true,
            }));
            setStreaming(false);
            setBusy(false);
          } else if (event.type === 'done') {
            patchMessage(assistantMsg.id, (m) => ({ ...m, done: true }));
            setStreaming(false);
            setBusy(false);
          }
        },
        onError: (error) => {
          patchMessage(assistantMsg.id, (m) => ({
            ...m,
            content: m.content
              ? m.content + `\n\n[连接中断] ${error.message}`
              : `[连接中断] ${error.message}`,
            done: true,
          }));
          setStreaming(false);
          setBusy(false);
        },
        onClose: () => {
          setStreaming(false);
          setBusy(false);
        },
      },
    );
    streamRef.current = handle;
  };

  const onSendPress = () => {
    if (streaming) {
      // 再次点击即为停止
      stopStreaming();
      return;
    }
    sendMessage(input);
  };

  const onNewChat = () => {
    clearConversation();
  };

  const onClearHistory = () => {
    const sid = sessionId;
    if (!sid) {
      clearConversation();
      return;
    }
    Alert.alert('清空会话', '确定删除该会话的所有消息吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: () => {
          agentApi
            .clearHistory(sid)
            .then(() => {
              clearConversation();
            })
            .catch((error) =>
              Alert.alert('操作失败', error instanceof Error ? error.message : '请稍后重试'),
            );
        },
      },
    ]);
  };

  const emptyGreeting = messages.length === 0;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <View style={styles.topbar}>
        <Text style={[styles.topbarTitle, { color: theme.text }]} numberOfLines={1}>
          {sessionTitle ?? '新对话'}
        </Text>
        <View style={styles.topbarActions}>
          <Pressable
            onPress={onClearHistory}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={19} color={theme.textSecondary} />
          </Pressable>
          <Pressable
            onPress={onNewChat}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Ionicons name="add-circle-outline" size={22} color={theme.tint} />
          </Pressable>
        </View>
      </View>

      {loadingHistory ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={theme.tint} />
          <Text style={[styles.centerText, { color: theme.textSecondary }]}>
            正在加载历史消息…
          </Text>
        </View>
      ) : emptyGreeting ? (
        <ScrollView contentContainerStyle={styles.greeting}>
          <View style={[styles.greetingIcon, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="airplane" size={30} color={theme.tint} />
          </View>
          <Text style={[styles.greetingTitle, { color: theme.text }]}>
            你好，我是途旅 AI
          </Text>
          <Text style={[styles.greetingSub, { color: theme.textSecondary }]}>
            告诉我你的旅行计划，我来帮你规划路线、推荐行程
          </Text>
          <View style={styles.suggestions}>
            {[
              '规划一条 3 天的成都旅行路线',
              '北京适合周末去哪些地方',
              '推荐适合亲子游的海岛',
            ].map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => sendMessage(suggestion)}
                style={[styles.suggestion, { backgroundColor: theme.backgroundElement }]}
              >
                <Text style={[styles.suggestionText, { color: theme.tint }]}>
                  {suggestion}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          >
            {messages.map((message) =>
              message.role === 'user' ? (
                <View key={message.id} style={styles.bubbleRowUser}>
                  <LinearGradient
                    colors={[theme.bubbleUser, theme.bubbleUserEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bubbleUser}
                  >
                    <Text style={styles.bubbleUserText}>{message.content}</Text>
                  </LinearGradient>
                </View>
              ) : (
                <View key={message.id} style={styles.bubbleRowAssistant}>
                  <View style={styles.assistantMeta}>
                    <View
                      style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}
                    >
                      <Ionicons name="sparkles" size={14} color={theme.tint} />
                    </View>
                    {message.reasoning ? (
                      <Pressable
                        onPress={() =>
                          setShowReasoningId((prev) =>
                            prev === message.id ? null : message.id,
                          )
                        }
                        style={({ pressed }) => [
                          styles.reasoningToggle,
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        <Ionicons
                          name={
                            showReasoningId === message.id
                              ? 'chevron-down'
                              : 'chevron-forward'
                          }
                          size={12}
                          color={theme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.reasoningToggleText,
                            { color: theme.textSecondary },
                          ]}
                        >
                          思考过程
                        </Text>
                      </Pressable>
                    ) : null}
                    {!message.done && !message.content && !message.reasoning ? (
                      <ActivityIndicator size="small" color={theme.tint} />
                    ) : null}
                  </View>
                  {message.reasoning && showReasoningId === message.id ? (
                    <View
                      style={[
                        styles.reasoningBox,
                        { backgroundColor: theme.backgroundElement },
                      ]}
                    >
                      <Text style={[styles.reasoningText, { color: theme.textSecondary }]}>
                        {message.reasoning}
                      </Text>
                    </View>
                  ) : null}
                  {message.content ? (
                    <View style={styles.assistantBody}>
                      <MarkdownText content={message.content} />
                      {!message.done ? (
                        <Text style={[styles.streamingDot, { color: theme.textSecondary }]}>
                          ●
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ),
            )}
          </ScrollView>

          <View style={[styles.inputBar, { borderTopColor: theme.backgroundSelected }]}>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
              placeholder="输入你的旅行问题…"
              placeholderTextColor={theme.textSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => input.trim() && onSendPress()}
              editable={!busy && !streaming}
              multiline
            />
            <Pressable
              onPress={onSendPress}
              style={({ pressed }) => [
                styles.sendButton,
                { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
              ]}
              disabled={busy || (!input.trim() && !streaming)}
            >
              {streaming ? (
                <Ionicons name="stop" size={18} color="#ffffff" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#ffffff" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topbarTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  topbarActions: { flexDirection: 'row', gap: 6 },
  iconButton: { padding: 6 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  centerText: { fontSize: 14 },
  greeting: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 10,
  },
  greetingIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  greetingTitle: { fontSize: 20, fontWeight: '700' },
  greetingSub: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  suggestions: { marginTop: 18, width: '100%', gap: 10 },
  suggestion: { borderRadius: 12, padding: 12 },
  suggestionText: { fontSize: 14, fontWeight: '500' },
  messagesScroll: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 24, gap: 14 },
  bubbleRowUser: { alignItems: 'flex-end' },
  bubbleUser: {
    maxWidth: '75%',
    borderRadius: 16,
    borderTopRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUserText: { color: '#ffffff', fontSize: 16, lineHeight: 23 },
  bubbleRowAssistant: { alignItems: 'flex-start', gap: 4 },
  assistantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 2,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasoningToggle: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: 2 },
  reasoningToggleText: { fontSize: 12 },
  reasoningBox: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 28,
    marginBottom: 4,
  },
  reasoningText: { fontSize: 13, lineHeight: 19 },
  /** AI 消息：无气泡，全宽正文排版（与小程序 ai-msg 一致） */
  assistantBody: {
    width: '100%',
    marginTop: 2,
  },
  streamingDot: { fontSize: 18, lineHeight: 10, marginTop: 2 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
