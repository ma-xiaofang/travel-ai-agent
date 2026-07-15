/**
 * 权限拦截
 * 主要分两个：路由权限、按钮权限
 * 1. 路由权限
 * 这里主要实现路由权限，实现了黑名单拦截，权限不够就拦截
 * 比如现在用户权限是 ['logined', 'vip'] 那么他能进入就只能是 permissionKeys 在 ['logined', 'vip'] 范围里面的路由
 * 如果页面 permissionKeys 是 ['logined', 'vip', 'admin']，那么这个页面就无法被当前用户访问
 * 如果页面 permissionKeys 是 ['logined']、['logined', 'vip']，或者没有 permissionKeys 那么这个页面可以被当前用户访问
 *
 * 2. 按钮权限在 utils/router.ts
 */
import { useUserStore } from '@/store'
import { getPermissionKeysByPath } from '@/utils'

const loginRoute = '/pages/routerDemo/login'

// 获取用户权限标识
const getUserPermissionKeys = () => {
  const userStore = useUserStore()
  return userStore.getUserPermissionKeys
}

/**
 * 实现原理：
 * 1. 或者所有需要登录的路由，存到黑名单，需要在 route-block 配置标识 key，根据 isNeedLogin 判断是否需要登录
 * 2. 在路由跳转前，判断是否需要登录，如果需要登录，判断是否已经登录，如果没有登录，跳转到登录页
 **/
const navigateToInterceptor = {
  invoke({ url }: { url: string }) {
    // 'pages.json' 里面的 path 是 'pages/index/index'
    // url 如果带参数则是 /pages/route-interceptor/index?name=uni-lin，所以需要去掉带的参数、去掉前面的 /
    const path = url.split('?')[0].slice(1) // pages/index/index
    // 用户已有权限
    const userPermissionKeys = getUserPermissionKeys() // ['logined', 'vip']
    // 页面所需权限
    const pageRoutePaths = getPermissionKeysByPath(path) // ['vip']
    // 两个权限取交集，然后交集再与用户权限取补集
    const LackPermissionKeys = pageRoutePaths.filter(item => !userPermissionKeys.includes(item))

    // 如果有权限就放行
    if (LackPermissionKeys.length === 0) {
      return true
    }

    /* ---------- 无权限，对缺少各种权限做处理 --------- */
    // 如果缺少登录权限，跳转到登录页
    if (LackPermissionKeys.includes('logined')) {
      const redirectRoute = `${loginRoute}?redirect=${encodeURIComponent(url)}`
      uni.navigateTo({ url: redirectRoute })
    }
    // 如果缺少其他权限，提示无权限，需要其他权限特殊判定可以继续添加
    else {
      uni.showToast({
        title: '无权限访问',
        icon: 'none'
      })
    }
    return false
  }
}

export const routerInterceptor = {
  install() {
    uni.addInterceptor('navigateTo', navigateToInterceptor)
    uni.addInterceptor('reLaunch', navigateToInterceptor)
    uni.addInterceptor('redirectTo', navigateToInterceptor)
    uni.addInterceptor('switchTab', navigateToInterceptor)
  }
}
