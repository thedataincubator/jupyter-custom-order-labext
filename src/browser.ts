import {
  DirListing,
  FileBrowser
} from '@jupyterlab/filebrowser';

import { CustomDirListing } from './listing';

export class CustomFileBrowser extends FileBrowser {
  protected createDirListing(options: DirListing.IOptions): CustomDirListing {
    return new CustomDirListing(options);
  }
}
