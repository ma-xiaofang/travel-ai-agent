import { defineConfig } from 'vite'
import path from 'node:path'
import uni from '@dcloudio/vite-plugin-uni'
import UniPages from '@uni-helper/vite-plugin-uni-pages'
import UniLayouts from '@uni-helper/vite-plugin-uni-layouts'
import AutoImport from 'unplugin-auto-import/vite'
import vitePluginDirectives from './vite-plugin/vite-plugin-directives'
import { WotResolver } from '@uni-helper/vite-plugin-uni-components/resolvers'
import ViteRestart from 'vite-plugin-restart'
import Components from '@uni-helper/vite-plugin-uni-components'

export default defineConfig(async () => {
  const UnoCSS = (await import('unocss/vite')).default
  return {
    plugins: [
      vitePluginDirectives({
        directives: 'v-perms' // 自定义指令名称（默认：v-perms）
      }),
      UniPages({
        exclude: ['**/components/**/**.*'], // 排除的文件
        routeBlockLang: 'json5', // 虽然设了默认值，但是vue文件还是要加上 lang="json5", 这样才能很好地格式化
        // homePage 通过 vue 文件的 route-block 的type="home"来设定
        // pages 目录为 src/pages，分包目录不能配置在pages目录下
        subPackages: ['src/pages-sub'], // 是个数组，可以配置多个，但是不能为pages里面的目录
        dts: 'src/types/uni-pages.d.ts' // 生成的类型文件，默认是 src/types/uni-pages.d.ts
      }),
      UniLayouts(),
      Components({
        resolvers: [WotResolver()]
      }),
      AutoImport({
        imports: ['vue', 'uni-app'],
        dts: 'src/types/auto-import.d.ts',
        dirs: ['src/hooks'], // 自动导入 hooks
        eslintrc: { enabled: true },
        vueTemplate: true // default false
      }),
      UnoCSS(),
      uni(),
      ViteRestart({
        // 通过这个插件，在修改vite.config.js文件则不需要重新运行也生效配置
        restart: ['vite.config.js']
      })
    ],
    resolve: {
      alias: {
        '@': path.join(process.cwd(), './src'),
        '@img': path.join(process.cwd(), './src/static')
      }
    },
    build: {
      target: 'es6',
    },
    esbuild: {
      target: 'es6',
    },
  }
})
