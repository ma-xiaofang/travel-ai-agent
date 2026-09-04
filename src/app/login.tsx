import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/stores/auth';

type Mode = 'login' | 'register';
type Field = 'username' | 'email' | 'password';

const LOGIN_BG = require('../../assets/images/login-bg.png');
const LOGO = require('../../assets/images/logo.png');

/** 品牌主色（与小程序工程 apps/miniprogram 一致） */
const BRAND = '#FF6B3D';
const GRADIENT: readonly [string, string, ...string[]] = ['#FF6B3D', '#FF8F5E'];

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<Field | null>(null);
  const [loading, setLoading] = useState(false);
  const [rowWidth, setRowWidth] = useState(0);
  // 以 state 持有稳定的动画值对象（避免编译器 refs 规则）
  const [slider] = useState(() => new Animated.Value(0));
  // 滑块宽度 = (容器宽 - 两侧 padding 6) / 2，滑动位移与其自身宽度一致
  const slotWidth = (rowWidth - 6) / 2;

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    Animated.timing(slider, {
      toValue: next === 'register' ? slotWidth : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  const onTabRowLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width !== rowWidth) setRowWidth(width);
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      Alert.alert('提示', '请输入用户名');
      return;
    }
    if (mode === 'register' && !email.trim()) {
      Alert.alert('提示', '请输入邮箱');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('提示', '密码至少 6 位');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(username.trim(), password);
      } else {
        await signUp({
          username: username.trim(),
          email: email.trim(),
          password,
        });
      }
      router.replace('/');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '操作失败，请稍后重试';
      Alert.alert(mode === 'login' ? '登录失败' : '注册失败', message);
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Image
        source={LOGIN_BG}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
      />
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.35)',
          'rgba(0,0,0,0.08)',
          'rgba(0,0,0,0.15)',
          'rgba(0,0,0,0.55)',
        ]}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 品牌区 */}
          <View style={styles.brandArea}>
            <View style={styles.logoBackdrop}>
              <Image source={LOGO} style={styles.logo} contentFit="contain" />
            </View>
            <Text style={styles.brandName}>途旅 AI</Text>
            <Text style={styles.brandDesc}>探索世界，从一次对话开始</Text>
          </View>

          {/* 表单卡片（玻璃拟态） */}
          <View style={styles.formCard}>
            {/* 登录 / 注册 切换 */}
            <View style={styles.tabRow} onLayout={onTabRowLayout}>
              {rowWidth > 0 && (
                <Animated.View
                  style={[
                    styles.tabSlider,
                    { width: slotWidth, transform: [{ translateX: slider }] },
                  ]}
                />
              )}
              {(['login', 'register'] as const).map((item) => {
                const active = mode === item;
                return (
                  <Pressable
                    key={item}
                    style={styles.tabItem}
                    onPress={() => switchMode(item)}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>
                      {item === 'login' ? '登录' : '注册'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 用户名 */}
            <InputGroup label="用户名" focused={focused === 'username'}>
              <TextInput
                style={inputFieldStyle(focused === 'username')}
                placeholder="请输入用户名"
                placeholderTextColor="#bbb"
                value={username}
                onChangeText={setUsername}
                onFocus={() => setFocused('username')}
                onBlur={() => setFocused((v) => (v === 'username' ? null : v))}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </InputGroup>

            {/* 邮箱（仅注册） */}
            {mode === 'register' && (
              <InputGroup label="邮箱" focused={focused === 'email'}>
                <TextInput
                  style={inputFieldStyle(focused === 'email')}
                  placeholder="请输入邮箱"
                  placeholderTextColor="#bbb"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused((v) => (v === 'email' ? null : v))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </InputGroup>
            )}

            {/* 密码 */}
            <InputGroup label="密码" focused={focused === 'password'}>
              <TextInput
                style={inputFieldStyle(focused === 'password')}
                placeholder="请输入密码"
                placeholderTextColor="#bbb"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused((v) => (v === 'password' ? null : v))}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </InputGroup>

            {/* 提交 */}
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.submit, loading && styles.submitDisabled]}
            >
              <Pressable
                style={styles.submitInner}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitText}>
                    {isLogin ? '登 录' : '注 册'}
                  </Text>
                )}
              </Pressable>
            </LinearGradient>
          </View>

          {/* 弹性占位：大屏时将提示行推向页脚 */}
          <View style={styles.spacer} />

          {/* 底部切换提示 */}
          <Text style={styles.footerTip}>
            {isLogin ? '还没有账号？' : '已有账号？'}
            <Text
              style={styles.footerLink}
              onPress={() => switchMode(isLogin ? 'register' : 'login')}
            >
              {isLogin ? '立即注册' : '去登录'}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function InputGroup({
  label,
  focused,
  children,
}: {
  label: string;
  focused: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.inputGroup, focused && styles.inputGroupFocused]}>
      <Text style={styles.inputLabel}>{label}</Text>
      {children}
    </View>
  );
}

function inputFieldStyle(focused: boolean) {
  return [
    styles.inputField,
    focused && {
      borderColor: BRAND,
      backgroundColor: '#FFF8F5',
    },
  ];
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: '#111418' },

  /* ======== 品牌区 ======== */
  content: {
    flexGrow: 1,
    paddingHorizontal: 36,
  },
  spacer: { flex: 1, minHeight: 16 },
  brandArea: { alignItems: 'center', marginBottom: 30 },
  logoBackdrop: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logo: { width: 42, height: 42 },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  brandDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 7,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  /* ======== 表单卡片（玻璃拟态） ======== */
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  /* ======== 标签切换 ======== */
  tabRow: {
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 18,
    backgroundColor: '#F5F6FA',
    borderRadius: 10,
    padding: 3,
  },
  tabSlider: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 9 },
  tabText: { fontSize: 14, color: '#999' },
  tabTextActive: { color: BRAND, fontWeight: '600' },

  /* ======== 输入组 ======== */
  inputGroup: {
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    borderRadius: 10,
  },
  inputGroupFocused: { borderColor: 'transparent' },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontWeight: '500',
  },
  inputField: {
    height: 42,
    backgroundColor: '#F8F9FB',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  /* ======== 提交按钮 ======== */
  submit: {
    marginTop: 16,
    borderRadius: 23,
    height: 46,
    shadowColor: BRAND,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    overflow: 'hidden',
  },
  submitInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.75 },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },

  /* ======== 底部提示 ======== */
  footerTip: {
    marginTop: 20,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  footerLink: {
    color: '#ffffff',
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginLeft: 2,
  },
});
