declare const wx: any;
declare function App<T>(options: T): void;
declare function Page<T>(options: T): void;
declare function Component<T>(options: T): void;
declare function getApp<T>(): T;

declare namespace WechatMiniprogram {
  interface AppOptions {
    globalData?: Record<string, any>;
    onLaunch?: () => void;
  }
}
