import { pages, subPackages } from '@/pages.json'
import { useUserStore } from '@/store'

/**
 * 根据路由路径，获取页面权限 permissionKeys: ['isNeedLogin', 'isVip', 'admin']
 **/
export const getPermissionKeysByPath = (path: string): string[] => {
  let navigateToPage
  if (path.split('/')[0] === 'pages') {
    navigateToPage = pages.find(page => page.path === path)
  } else {
    navigateToPage = subPackages.find((page: Record<string, any>) => page.path === path)
  }
  return navigateToPage ? navigateToPage.permissionKeys || [] : []
}

/**
 * 获取上一页路由路径
 **/
const getLastPage = () => {
  // getCurrentPages() 至少有1个元素，所以不再额外判断
  // const lastPage = getCurrentPages().at(-1)
  // 上面那个在低版本安卓中打包回报错，所以改用下面这个【虽然我加了src/interceptions/prototype.ts，但依然报错】
  const pages = getCurrentPages()
  return pages[pages.length - 1]
}

// 确保 decodeURIComponent 递归调用
const ensureDecodeURIComponent = (url: string) => {
  if (url.startsWith('%')) {
    return ensureDecodeURIComponent(decodeURIComponent(url))
  }
  return url
}

/**
 * 解析 url 得到 path 和 query
 * 比如输入url: /pages/login/index?redirect=%2Fpages%2Fdemo%2Fbase%2Froute-interceptor
 * 输出: {path: /pages/login/index, query: {redirect: /pages/demo/base/route-interceptor}}
 */
const getUrlObj = (url: string) => {
  const [path, queryStr] = url.split('?')

  if (!queryStr) {
    return {
      path,
      query: {}
    }
  }
  const query: Record<string, string> = {}
  queryStr.split('&').forEach(item => {
    const [key, value] = item.split('=')
    query[key] = ensureDecodeURIComponent(value) // 这里需要统一 decodeURIComponent 一下，可以兼容h5和微信y
  })
  return { path, query }
}

/**
 * 根据当前路由路径，判定是否有 redirectPath 路由，如果有则跳转，没有则返回 false
 **/
export const redirectRouteTo = () => {
  // 获取上一页路由路径
  const lastPage = getLastPage()
  const currRoute = (lastPage as any).$page
  const { fullPath } = currRoute as { fullPath: string }
  // 获取上一页路由路径的 query 参数
  const { query } = getUrlObj(fullPath)
  //
  const { redirect } = query
  if (redirect) {
    uni.redirectTo({
      url: redirect
    })
    return true
  } else {
    return false
  }
}

/* 自定义指令 按钮权限控制 */
export const checkBtnPermission = (btnPermissions: string[]) => {
  const store = useUserStore() // 放函数内是为了保证，每次调用都获取最新的用户权限
  const userBtnPermissions = store.getUserBtnPermission // 用户已有按钮权限
  const intersectionPermissions = btnPermissions.filter(item => userBtnPermissions.includes(item)) // 用户已有按钮权限与当前按钮权限的交集
  return !!(intersectionPermissions.length === btnPermissions.length)
}
