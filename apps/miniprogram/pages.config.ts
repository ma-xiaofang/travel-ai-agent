import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages'

export default defineUniPages({
  pages: [
    {
      path: 'pages/chat/index',
      type: 'home',
      style: {
        navigationStyle: 'custom',
        navigationBarTextStyle: 'black',
      },
    },
    {
      path: 'pages/sessions/index',
      style: {
        navigationStyle: 'custom',
        navigationBarTextStyle: 'black',
      },
    },
    {
      path: 'pages/mine/index',
      style: {
        navigationStyle: 'custom',
        navigationBarTextStyle: 'white',
      },
    },
    {
      path: 'pages/login/index',
      style: {
        navigationStyle: 'custom',
        navigationBarTextStyle: 'white',
      },
    },
  ],
  globalStyle: {
    navigationBarBackgroundColor: '#FF6B3D',
    navigationBarTextStyle: 'white',
    navigationBarTitleText: '途旅 AI',
    backgroundColor: '#F5F7FA',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#FF6B3D',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/chat/index',
        text: '对话',
        iconPath: 'static/tabbar/chat.png',
        selectedIconPath: 'static/tabbar/chat-active.png',
      },
      {
        pagePath: 'pages/sessions/index',
        text: '会话',
        iconPath: 'static/tabbar/history.png',
        selectedIconPath: 'static/tabbar/history-active.png',
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'static/tabbar/mine.png',
        selectedIconPath: 'static/tabbar/mine-active.png',
      },
    ],
  },
  easycom: {
    autoscan: true,
    custom: {
      '^wd-(.*)': 'wot-design-uni/components/wd-$1/wd-$1.vue',
      '^(?!z-paging-refresh|z-paging-load-more)z-paging(.*)': 'z-paging/components/z-paging$1/z-paging$1.vue',
    },
  },
})
