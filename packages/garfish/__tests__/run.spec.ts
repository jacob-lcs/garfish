import Garfish from '@garfish/core';
import { GarfishRouter } from '@garfish/router';
import { GarfishBrowserVm } from '@garfish/browser-vm';
import { mockStaticServer } from '@garfish/test-suite';
import {
  __MockBody__,
  __MockHead__,
  __MockHtml__,
  appContainerId,
} from '@garfish/utils';
import assert from 'assert';

const vueAppRootNode = 'vue-app';
const vueAppRootText = 'vue app init page';
const reactAppRootNode = 'react-app';
const reactAppRootText = 'react app init page';

function waitFor(delay = 50) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), delay);
  });
}

async function vueAppInDocument(container: Element) {
  await waitFor();
  const appContainer = container.querySelectorAll(`[id^=${appContainerId}]`);
  expect(appContainer).toHaveLength(1);
  assert(appContainer[0]);
  assert(appContainer[0].querySelector(`#${vueAppRootNode}`));
  expect(appContainer[0].querySelector(`#${vueAppRootNode}`)?.innerHTML).toBe(
    vueAppRootText,
  );
}

async function reactAppInDocument(container: Element) {
  await waitFor();
  const appContainer = container.querySelectorAll(`[id^=${appContainerId}]`);
  expect(appContainer).toHaveLength(1);
  assert(appContainer[0].querySelector(`#${reactAppRootNode}`));
  expect(appContainer[0].querySelector(`#${reactAppRootNode}`)?.innerHTML).toBe(
    reactAppRootText,
  );
}

async function noRenderApp(container: Element) {
  await waitFor();
  const appContainer = container.querySelectorAll(`[id^=${appContainerId}]`);
  expect(appContainer).toHaveLength(0);
}

const mockBeforeLoad = jest.fn();
const mockAfterLoad = jest.fn();
const mockBeforeMount = jest.fn();
const mockAfterMount = jest.fn();
const mockBeforeUnmount = jest.fn();
const mockAfterUnmount = jest.fn();
const mockBeforeEval = jest.fn();
const mockAfterEval = jest.fn();

describe('Core: run methods', () => {
  let GarfishInstance: Garfish;

  mockStaticServer({
    baseDir: __dirname,
  });

  beforeEach(() => {
    GarfishInstance = new Garfish({});

    GarfishInstance.run({
      basename: '/',
      domGetter: '#container',
      plugins: [GarfishRouter(), GarfishBrowserVm()],
      apps: [
        {
          name: 'vue-app',
          activeWhen: '/vue-app',
          entry: './resources/vueApp.html',
        },
        {
          name: 'react-app',
          activeWhen: '/react-app',
          entry: './resources/reactApp.html',
        },
      ],
      beforeLoad: mockBeforeLoad,
      afterLoad: mockAfterLoad,
      beforeEval: mockBeforeEval,
      afterEval: mockAfterEval,
      beforeMount: mockBeforeMount,
      afterMount: mockAfterMount,
      beforeUnmount: mockBeforeUnmount,
      afterUnmount: mockAfterUnmount,
    });
  });

  it('auto render and destroy vue app', async () => {
    const container = document.createElement('div');
    container.setAttribute('id', 'container');
    document.body.appendChild(container);

    GarfishInstance.router.push({ path: '/vue-app' });
    await vueAppInDocument(container);
    await waitFor(1000);
    expect(mockBeforeLoad.mock.calls[0][0].name).toBe('vue-app');
    expect(mockAfterLoad.mock.calls[0][0].name).toBe('vue-app');
    expect(mockBeforeMount.mock.calls[0][0].name).toBe('vue-app');
    expect(mockAfterMount.mock.calls[0][0].name).toBe('vue-app');
    expect(mockBeforeEval.mock.calls[0][0].name).toBe('vue-app');
    expect(
      mockBeforeEval.mock.calls.map((callArgs) => {
        return callArgs[3];
      }),
    ).toMatchSnapshot();

    GarfishInstance.router.push({ path: '/react-app' });
    await reactAppInDocument(container);
    expect(mockBeforeMount.mock.calls[0][0].name).toBe('vue-app');
    expect(mockAfterMount.mock.calls[0][0].name).toBe('vue-app');

    expect(mockBeforeLoad.mock.calls[1][0].name).toBe('react-app');
    expect(mockAfterLoad.mock.calls[1][0].name).toBe('react-app');
    expect(mockBeforeMount.mock.calls[1][0].name).toBe('react-app');
    expect(mockAfterMount.mock.calls[1][0].name).toBe('react-app');

    GarfishInstance.router.push({ path: '/' });
    await noRenderApp(container);
    expect(mockBeforeMount.mock.calls[1][0].name).toBe('react-app');
    expect(mockAfterMount.mock.calls[1][0].name).toBe('react-app');

    document.body.removeChild(container);
  });

  it('close router listening', async () => {
    const container = document.createElement('div');
    container.setAttribute('id', 'container');
    document.body.appendChild(container);
    await noRenderApp(container);

    GarfishInstance.router.push({ path: '/react-app' });
    await reactAppInDocument(container);

    GarfishInstance.router.setRouterConfig({ listening: false });
    GarfishInstance.router.push({ path: '/vue-app' });
    await noRenderApp(container);
    GarfishInstance.router.push({ path: '/react-app' });
    await noRenderApp(container);
    GarfishInstance.router.push({ path: '/' });
    await noRenderApp(container);

    GarfishInstance.router.setRouterConfig({ listening: true });
    GarfishInstance.router.push({ path: '/vue-app' });
    await vueAppInDocument(container);
  });
});
