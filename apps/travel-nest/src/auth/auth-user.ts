/** JWT 校验通过后挂载到 req.user 的对象 */
export interface AuthUser {
  userId: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
}
