/** 统一响应体 */
export class ResponseDto<T = any> {
  /** 业务状态码，200 表示成功 */
  code: number;
  /** 提示信息 */
  message: string;
  /** 响应数据 */
  data: T;
}

/** 构建成功响应 */
export function ok<T>(data: T, message = '操作成功'): ResponseDto<T> {
  return { code: 200, message, data };
}

/** 构建失败响应 */
export function fail(code: number, message: string, data: any = null): ResponseDto {
  return { code, message, data };
}
