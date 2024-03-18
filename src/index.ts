// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';
import {
  FileBrowser,
  FilterFileBrowserModel,
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

const plugin: JupyterFrontEndPlugin<IFileBrowserFactory> = {
  id: 'jupytercustomsort-labext',
  provides: IFileBrowserFactory,
  requires: [IDocumentManager, ITranslator],
  optional: [IStateDB, IRouter, JupyterFrontEnd.ITreeResolver],
  activate: async (
    app: JupyterFrontEnd,
    docManager: IDocumentManager,
    translator: ITranslator,
    state: IStateDB | null,
    router: IRouter | null,
    tree: JupyterFrontEnd.ITreeResolver | null
  ): Promise<IFileBrowserFactory> => {
    const { commands } = app;
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

    // Manually restore and load the default file browser.
    const defaultBrowser = createFileBrowser('filebrowser', {
      auto: false,
      restore: false
    });
    void Private.restoreBrowser(defaultBrowser, commands, router, tree);
    console.log(commands);

    return { createFileBrowser, defaultBrowser, tracker };
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

export default plugin;
