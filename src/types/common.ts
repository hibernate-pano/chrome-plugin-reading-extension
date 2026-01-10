/**
 * 通用类型定义
 * 提供跨项目使用的通用类型
 */

/**
 * 使某些属性可选
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 使某些属性必需
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * 深度只读
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 深度部分可选
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 提取Promise的返回类型
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

/**
 * 函数类型
 */
export type AnyFunction = (...args: any[]) => any;
export type VoidFunction = () => void;
export type AsyncFunction<T = void> = () => Promise<T>;

/**
 * 通用回调类型
 */
export type Callback<T = void> = (value: T) => void;
export type ErrorCallback = (error: Error) => void;
export type AsyncCallback<T = void> = (value: T) => Promise<void>;

/**
 * 键值对类型
 */
export type KeyValuePair<K extends string | number | symbol = string, V = unknown> = {
  [key in K]: V;
};

/**
 * JSON值类型
 */
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}
export type JSONArray = JSONValue[];

/**
 * 可空类型
 */
export type Nullable<T> = T | null;
export type Maybe<T> = T | null | undefined;

/**
 * 结果类型（用于错误处理）
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * 异步结果类型
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * 状态类型
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * 分页类型
 */
export interface Pagination {
  page: number;
  pageSize: number;
  total?: number;
}

/**
 * 分页数据
 */
export interface PaginatedData<T> {
  items: T[];
  pagination: Pagination;
}

/**
 * 排序方向
 */
export type SortDirection = 'asc' | 'desc';

/**
 * 排序配置
 */
export interface SortConfig<T = string> {
  field: T;
  direction: SortDirection;
}

/**
 * 筛选配置
 */
export interface FilterConfig<T = string> {
  field: T;
  value: unknown;
  operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
}

/**
 * 类型守卫辅助函数
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isFunction(value: unknown): value is AnyFunction {
  return typeof value === 'function';
}

export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return value instanceof Promise || (isObject(value) && 'then' in value && isFunction(value.then));
}

export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}
