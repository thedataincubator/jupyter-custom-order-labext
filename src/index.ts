// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  JupyterLab
} from '@jupyterlab/application';
import { WidgetTracker } from '@jupyterlab/apputils';
import {
  FileBrowser,
  FilterFileBrowserModel,
  IDefaultFileBrowser,
  IFileBrowserFactory
} from '@jupyterlab/filebrowser';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { folderIcon } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';

import { CustomFileBrowser } from './browser'

/**
 * The command IDs used by the file browser plugin.
 */
namespace CommandIDs {
  // For main browser only.
  export const toggleBrowser = 'filebrowser:toggle-main';
}

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
    labShell: ILabShell | null,
    translator: ITranslator | null
  ): Promise<IDefaultFileBrowser> => {
    const { commands } = app;
    const trans = (translator ?? nullTranslator).load('jupyterlab');

    // Manually restore and load the default file browser.
    const defaultBrowser = fileBrowserFactory.createFileBrowser('filebrowser', {
      auto: false,
      restore: false
    });

    // Set attributes when adding the browser to the UI
    defaultBrowser.node.setAttribute('role', 'region');
    defaultBrowser.node.setAttribute(
      'aria-label',
      trans.__('File Browser Section')
    );
    defaultBrowser.node.setAttribute('title', trans.__('File Browser'));
    defaultBrowser.title.icon = folderIcon;

    // Show the current file browser shortcut in its title.
    const updateBrowserTitle = () => {
      const binding = app.commands.keyBindings.find(
        b => b.command === CommandIDs.toggleBrowser
      );
      if (binding) {
        const ks = binding.keys.map(CommandRegistry.formatKeystroke).join(', ');
        defaultBrowser.title.caption = trans.__('File Browser (%1)', ks);
      } else {
        defaultBrowser.title.caption = trans.__('File Browser');
      }
    };
    updateBrowserTitle();
    app.commands.keyBindingChanged.connect(() => {
      updateBrowserTitle();
    });

    void Private.restoreBrowser(
      defaultBrowser,
      commands,
      router,
      tree,
      app,
      labShell
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
    tree: JupyterFrontEnd.ITreeResolver | null,
    app: JupyterFrontEnd,
    labShell: ILabShell | null
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

      if (labShell?.isEmpty('main')) {
        void commands.execute('launcher:create');
      }
    };
    router.routed.connect(listener);
  }
}

const plugins: JupyterFrontEndPlugin<any>[] = [
  factory,
  defaultFileBrowser
];

export default plugins;
