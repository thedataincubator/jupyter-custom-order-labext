// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DirListing } from '@jupyterlab/filebrowser';
import { URLExt } from '@jupyterlab/coreutils';
import {
  Contents,
  ServerConnection
} from '@jupyterlab/services';
import {
  IIterator,
  toArray
} from '@lumino/algorithm';

class HttpError extends Error {
  constructor(msg: string, code: number) {
    super(msg);
    this.code = code;
    Object.setPrototypeOf(this, HttpError.prototype);
  }

  code: number;
}

export class CustomDirListing extends DirListing {
  constructor(options: DirListing.IOptions) {
    super(options);
    this._model.pathChanged.connect(this.pathChanged, this);
    this.pathChanged();
  }

  sort(state: DirListing.ISortState): void {
    // Access private attributes
    this['_sortedItems'] = Private.sort(this.model.items(), state, this.customOrder);
    this['_sortState'] = state;
    this.update();
  }

  async pathChanged(): Promise<void> {
    this.customOrder = [];
    try {
      this.customOrder = (await Private.customOrderRequest(this._model.path)).order;
      this.sort(this['_sortState']);
    } catch (error) {
      if (!(error instanceof HttpError) || error.code !== 404)
        console.log(error);
    }
  }

  protected customOrder: Array<string> = [];
}

namespace Private {
  namespace CmpFunctions {
    export function last_modified(
      a: Contents.IModel,
      b: Contents.IModel,
      _: Array<string>
    ): number {
      const valA = new Date(a.last_modified).getTime();
      const valB = new Date(b.last_modified).getTime();
      return valA - valB;
    }

    export function name(
      a: Contents.IModel,
      b: Contents.IModel,
      customOrder: Array<string>
    ): number {
      const aIndex = customOrder.indexOf(a.name);
      const bIndex = customOrder.indexOf(b.name);
      if (aIndex > -1 && bIndex > -1)
        return bIndex - aIndex;
      if (aIndex > -1)
        return 1;
      if (bIndex > -1)
        return -1;
      return b.name.localeCompare(a.name);
    }
  };

  export function sort(
    items: IIterator<Contents.IModel>,
    state: DirListing.ISortState,
    customOrder: Array<string>
  ): Contents.IModel[] {
    const copy = toArray(items);
    const reverse = state.direction === 'descending' ? 1 : -1;
    const cmpFunc = CmpFunctions[state.key];

    // Sort by last modified (grouping directories first)
    copy.sort((a, b) => {
      const t1 = a.type === 'directory' ? 0 : 1;
      const t2 = b.type === 'directory' ? 0 : 1;

      return t1 - t2 || cmpFunc(a, b, customOrder) * reverse;
    });
    return copy;
  }

  export async function customOrderRequest(path: string): Promise<any> {
    const settings = ServerConnection.makeSettings();
    const url = URLExt.join(settings.baseUrl, 'customorder', path);
    let response = await ServerConnection.makeRequest(url, {}, settings);
    if (!response.ok)
      throw new HttpError('Failed to load custom order', response.status);
    return await response.json();
  }
}
