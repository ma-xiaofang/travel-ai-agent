import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

/** 静态资源对外访问前缀 */
export const UPLOAD_URL_PREFIX = '/uploads';

/**
 * 上传文件根目录（默认用户家目录下的 uploads/，可用 UPLOAD_DIR 覆盖）。
 *
 * 放在项目仓库之外，避免构建 / 重新部署时被清理。
 * 延迟解析：dotenv 在 main.ts 中先于业务调用执行，此处按需读取环境变量。
 */
export function getUploadRoot(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  return configured ? resolve(expandHome(configured)) : resolve(homedir(), 'uploads');
}

/**
 * 展开路径中的 `~` 与 `$HOME`。
 *
 * dotenv 不会解析变量，`.env` 中写成 `UPLOAD_DIR=$HOME/uploads` 时
 * 取到的会是字面量，因此这里统一按家目录展开。
 */
function expandHome(input: string): string {
  const home = homedir();
  if (input === '~') {
    return home;
  }
  if (input.startsWith('~/')) {
    return resolve(home, input.slice(2));
  }
  return input.replace(/^\$(?:HOME|\{HOME\})/, home);
}

/** 头像存放目录：<UPLOAD_ROOT>/avatars */
export function getAvatarDir(): string {
  return resolve(getUploadRoot(), 'avatars');
}

/** 确保上传目录存在（启动时调用一次即可） */
export function ensureUploadDirs(): void {
  mkdirSync(getAvatarDir(), { recursive: true });
}