// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  JupyterLab
} from '@jupyterlab/application';
import {
  FileBrowser,
  FilterFileBrowserModel,
  IDefaultFileBrowser,
  IFileBrowserFactory
} from '@jupyterlab/filebrowser';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { ITranslator } from '@jupyterlab/translation';
import { IStateDB } from '@jupyterlab/statedb';
import { WidgetTracker } from '@jupyterlab/apputils';
import { CommandRegistry } from '@lumino/commands';

import { CustomFileBrowser } from './browser'

/**
 * The default file browser factory provider.
 */
const namespace = 'filebrowser';

const factory: JupyterFrontEndPlugin<IFileBrowserFactory> = {
  id: '@jupyterlab/jupyter_custom_order',
  description: 'Provides the file browser factory.',
  provides: IFileBrowserFactory,
  requires: [IDocumentManager, ITranslator],
  optional: [IStateDB, JupyterLab.IInfo],
  activate: async (
    app: JupyterFrontEnd,
    docManager: IDocumentManager,
    translator: ITranslator,
    state: IStateDB | null,
    info: JupyterLab.IInfo | null
  ): Promise<IFileBrowserFactory> => {
    const tracker = new WidgetTracker<FileBrowser>({ namespace });
    const createFileBrowser = (
      id: string,
      options: IFileBrowserFactory.IOptions = {}
    ) => {
      const model = new FilterFileBrowserModel({
        translator: translator,
        auto: options.auto ?? true,
        manager: docManager,
        driveName: options.driveName || '',
        refreshInterval: options.refreshInterval,
        refreshStandby: () => {
          if (info) {
            return !info.isConnected || 'when-hidden';
          }
          return 'when-hidden';
        },
        state:
          options.state === null
            ? undefined
            : options.state || state || undefined
      });
      const restore = options.restore;
      const widget = new CustomFileBrowser({ id, model, restore, translator });

      // Track the newly created file browser.
      void tracker.add(widget);

      return widget;
    };

    return { createFileBrowser, tracker };
  }
};

const defaultFileBrowser: JupyterFrontEndPlugin<IDefaultFileBrowser> = {
  id: '@jupyterlab/jupyterlab_custom_order',
  description: 'Provides the default file browser',
  provides: IDefaultFileBrowser,
  requires: [IFileBrowserFactory],
  optional: [IRouter, JupyterFrontEnd.ITreeResolver, ILabShell],
  activate: async (
    app: JupyterFrontEnd,
    fileBrowserFactory: IFileBrowserFactory,
    router: IRouter | null,
    tree: JupyterFrontEnd.ITreeResolver | null,
    labShell: ILabShell | null
  ): Promise<IDefaultFileBrowser> => {
    const { commands } = app;

    // Manually restore and load the default file browser.
    const defaultBrowser = fileBrowserFactory.createFileBrowser('filebrowser', {
      auto: false,
      restore: false
    });
    void Private.restoreBrowser(
      defaultBrowser,
      commands,
      router,
      tree
    );
    return defaultBrowser;
  }
};

namespace Private {
  /**
   * Restores file browser state and overrides state if tree resolver resolves.
   */
  export async function restoreBrowser(
    browser: FileBrowser,
    commands: CommandRegistry,
    router: IRouter | null,
    tree: JupyterFrontEnd.ITreeResolver | null
  ): Promise<void> {
    const restoring = 'jp-mod-restoring';

    browser.addClass(restoring);

    if (!router) {
      await browser.model.restore(browser.id);
      await browser.model.refresh();
      browser.removeClass(restoring);
      return;
    }

    const listener = async () => {
      router.routed.disconnect(listener);

      const paths = await tree?.paths;
      if (paths?.file || paths?.browser) {
        // Restore the model without populating it.
        await browser.model.restore(browser.id, false);
        if (paths.file) {
          await commands.execute('filebrowser:open-path', {
            path: paths.file,
            dontShowBrowser: true
          });
        }
        if (paths.browser) {
          await commands.execute('filebrowser:open-path', {
            path: paths.browser,
            dontShowBrowser: true
          });
        }
      } else {
        await browser.model.restore(browser.id);
        await browser.model.refresh();
      }
      browser.removeClass(restoring);
    };
    router.routed.connect(listener);
  }
}

const plugins: JupyterFrontEndPlugin<any>[] = [
  factory,
  defaultFileBrowser
];

export default plugins;
