import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as agentApi from '@/api/agentApi';
import type { SessionItem } from '@/api/types';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/lib/format';
import { setPendingSession } from '@/stores/chatBus';

export default function HistoryScreen() {
  const theme = useTheme();

  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setSessions(null);
    try {
      const list = await agentApi.listSessions();
      setSessions(list);
    } catch (error) {
      if (sessions === null && !silent) {
        Alert.alert('加载失败', error instanceof Error ? error.message : '请稍后重试');
        setSessions([]);
      }
    }
  }, [sessions]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const openSession = (session: SessionItem) => {
    setPendingSession({ sessionId: session.id, title: session.title });
    router.navigate('/');
  };

  const renderItem = ({ item }: { item: SessionItem }) => {
    const count = item._count?.messages ?? 0;
    return (
      <Pressable
        onPress={() => openSession(item)}
        style={({ pressed }) => [
          styles.item,
          { backgroundColor: theme.backgroundElement },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.itemIcon}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.tint} />
        </View>
        <View style={styles.itemBody}>
          <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title ?? '新对话'}
          </Text>
          <Text style={[styles.itemSub, { color: theme.textSecondary }]}>
            {count > 0 ? `${count} 条消息 · ` : ''}
            {formatRelativeTime(item.updatedAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <View style={styles.topbar}>
        <Text style={[styles.topbarTitle, { color: theme.text }]}>历史会话</Text>
        <Pressable
          onPress={() => load(true)}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="refresh" size={20} color={theme.tint} />
        </Pressable>
      </View>

      {sessions === null ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={theme.tint} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="time-outline" size={44} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            还没有历史会话
          </Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            去「对话」页开始你的第一段旅程规划吧
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topbarTitle: { fontSize: 20, fontWeight: '700' },
  iconButton: { padding: 6 },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 60,
  },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  emptySub: { fontSize: 13 },
  list: { padding: 16, paddingTop: 4, gap: 10 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(127,127,127,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1, gap: 3 },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemSub: { fontSize: 13 },
});
