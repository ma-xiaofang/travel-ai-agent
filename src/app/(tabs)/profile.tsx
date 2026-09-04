import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as agentApi from '@/api/agentApi';
import { BASE_URL } from '@/api/http';
import type { HealthResult } from '@/api/types';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/stores/auth';

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();

  const [health, setHealth] = useState<HealthResult | null>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const result = await agentApi.getHealth();
      setHealth(result);
    } catch (error) {
      setHealth(null);
      Alert.alert('无法连接服务', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setChecking(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!health) checkHealth();
    }, [checkHealth, health]),
  );

  const onLogout = () => {
    Alert.alert('退出登录', '确定要退出当前账号吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch {
            // 本地令牌清理失败不影响继续
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: theme.tint }]}>
            <Ionicons name="airplane" size={30} color="#ffffff" />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>途旅 AI</Text>
          <Text style={[styles.appDesc, { color: theme.textSecondary }]}>
            智能旅行规划助手
          </Text>
          <Text style={[styles.version, { color: theme.textSecondary }]}>
            v{Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <InfoRow label="服务地址" value={BASE_URL || '（未配置）'} />
          {health ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
              <InfoRow label="服务状态" value={health.status === 'ok' ? '正常' : health.status} />
              <InfoRow label="模型" value={health.model} />
              <InfoRow label="联网搜索" value={health.webSearch} />
            </>
          ) : null}
        </View>

        <Pressable
          onPress={checkHealth}
          disabled={checking}
          style={({ pressed }) => [
            styles.checkButton,
            { backgroundColor: theme.backgroundElement },
            pressed && { opacity: 0.7 },
          ]}
        >
          {checking ? (
            <ActivityIndicator color={theme.tint} />
          ) : (
            <>
              <Ionicons name="pulse-outline" size={18} color={theme.tint} />
              <Text style={[styles.checkText, { color: theme.text }]}>
                {health ? '重新检测' : '检测服务状态'}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="log-out-outline" size={19} color="#e5484d" />
          <Text style={styles.logoutText}>退出登录</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, gap: 16 },
  header: { alignItems: 'center', marginBottom: 6, gap: 4 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  appName: { fontSize: 22, fontWeight: '700' },
  appDesc: { fontSize: 14 },
  version: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: 16, padding: 16, gap: 10 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  checkText: { fontSize: 15, fontWeight: '600' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5484d',
    paddingVertical: 14,
    marginTop: 8,
  },
  logoutText: { color: '#e5484d', fontSize: 15, fontWeight: '600' },
});
