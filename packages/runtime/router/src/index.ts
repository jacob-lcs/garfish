import { interfaces } from '@garfish/core';
import { assert, createKey, warn } from '@garfish/utils';
import router, { listenRouterAndReDirect, RouterInterface } from './context';

interface Options {
  autoRefreshApp?: boolean;
  onNotMatchRouter?: (path: string) => Promise<void> | void;
}

declare module '@garfish/core' {
  export namespace interfaces {
    // export interface Garfish {
    //   router: RouterInterface;
    // }
    export interface AppInfo {
      activeWhen?: string | ((path: string) => boolean); // 手动加载，可不填写路由
      active?: (appInfo: AppInfo, rootPath: string) => void;
      deactive?: (appInfo: AppInfo, rootPath: string) => void;
    }
  }
}

export default function Router(args?: Options) {
  return function (Garfish: interfaces.Garfish): interfaces.Plugin {
    // Garfish.router = router;
    return {
      name: 'router',
      version: __VERSION__,
      bootstrap(options) {
        let activeApp = null;
        const unmounts: Record<string, Function> = {};
        const { apps, basename } = options;
        const { autoRefreshApp = true, onNotMatchRouter = () => null } =
          args || {};

        async function active(appInfo: interfaces.AppInfo, rootPath: string) {
          const { name, cache, active } = appInfo;
          if (active) return active(appInfo, rootPath);

          const currentApp = (activeApp = createKey());
          const app = await Garfish.loadApp(appInfo.name, {
            basename: rootPath,
            entry: appInfo.entry,
            domGetter: appInfo.domGetter || options.domGetter,
          });

          const call = (app: interfaces.App, isRender: boolean) => {
            if (!app) return;

            const fn = isRender ? app.mount : app.unmount;
            return fn.call(app);
          };

          Garfish.activeApps[name] = app;
          unmounts[name] = () => call(app, false);

          if (currentApp === activeApp) {
            await call(app, true);
          }
        }

        async function deactive(appInfo: interfaces.AppInfo, rootPath: string) {
          activeApp = null;
          const { name, deactive } = appInfo;
          if (deactive) return deactive(appInfo, rootPath);

          const unmount = unmounts[name];
          unmount && unmount();
          delete Garfish.activeApps[name];
        }

        const listenOptions = {
          basename,
          active,
          deactive,
          autoRefreshApp,
          notMatch: onNotMatchRouter,
          apps: apps.filter(
            (app) => app.activeWhen !== null && app.activeWhen !== undefined,
          ) as Array<Required<interfaces.AppInfo>>,
        };

        listenRouterAndReDirect(listenOptions);
      },
    };
  };
}
