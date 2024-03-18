import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jupyterlab_custom_order extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_custom_order:plugin',
  description: 'Custom ordering of files in the directory views in Jupyter',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab_custom_order is activated!');
  }
};

export default plugin;
