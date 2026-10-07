/**
 * 自定义 Jest 测试环境：只做一件事 —— 把 `jest-environment-node` 指向 jest 30 自带的版本。
 *
 * 背景：monorepo 里同时存在 jest@27（其它工作区包的传递依赖），pnpm 会把它的
 * `jest-environment-node@27` 提升到 `node_modules/.pnpm/node_modules`。jest 配置里直接写
 * `testEnvironment: "node"` 会命中这个旧版本，而 jest 30 的 Runtime 需要新版 jest-mock 上的
 * `clearMocksOnScope`，于是启动即报 `this._moduleMocker.clearMocksOnScope is not a function`。
 *
 * 这里从 jest 自身的依赖树（jest → jest-config → jest-environment-node）解析出正确版本，
 * 避免在配置里硬编码 `.pnpm` 路径或多余地声明依赖。
 */
const path = require('node:path');

const jestDir = path.dirname(require.resolve('jest/package.json'));
const jestConfigDir = path.dirname(
  require.resolve('jest-config/package.json', { paths: [jestDir] }),
);

module.exports = require(
  require.resolve('jest-environment-node', { paths: [jestConfigDir] }),
);