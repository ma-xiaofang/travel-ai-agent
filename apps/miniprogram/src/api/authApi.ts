/**
 * 认证 API — 注册 / 登录 / 刷新令牌 / 登出
 *
 * 后端路由: api/auth
 */
import http from '@/http/httpClient'
import { useUserStore } from '@/store'
import type { LoginParams, RegisterParams, TokenPair } from '@/types/api'

/** 用户注册 */
export async function registerApi(data: RegisterParams) {
    const res: any = await http.post('/api/auth/register', { data })
    const store = useUserStore()
    store.setUserInfo({
        refreshToken: res.data.refreshToken,
        accessToken: res.data.accessToken,
    })
    return res.data as TokenPair
}

/** 用户登录 */
export async function loginApi(data: LoginParams) {
    const res: any = await http.post('/api/auth/login', { data })
    const store = useUserStore()
    store.setUserInfo({
        refreshToken: res.data.refreshToken,
        accessToken: res.data.accessToken,
    })
    return res.data as TokenPair
}

/** 刷新令牌对（用 refreshToken 换取新 accessToken + refreshToken） */
export async function refreshTokenApi() {
    const store = useUserStore()
    const { refreshToken } = store.userInfo || {}
    const res: any = await http.post('/api/auth/refresh', {
        data: { refreshToken },
    })
    store.setUserInfo({
        refreshToken: res.data.refreshToken,
        accessToken: res.data.accessToken,
    })
    return res
}

/** 登出（销毁 refreshToken） */
export async function logoutApi() {
    const store = useUserStore()
    const { refreshToken } = store.userInfo || {}
    await http.post('/api/auth/logout', {
        data: { refreshToken },
    })
    store.clearUserInfo()
}
