from jupyter_server.utils import url_path_join
from jupyter_server.base.handlers import AuthenticatedFileHandler, path_regex
from tornado import web


class FileOrderHandler(AuthenticatedFileHandler):
    @web.authenticated
    def get(self, path=""):
        # Path comes in with a leading slash, but changing the routing to put the slash
        # in the route breaks everything.  This strip is what Jupyter itself does.
        return super().get(url_path_join(path.strip("/"), ".custom_order"))

    def validate_absolute_path(self, root, absolute_path):
        # Disable the hidden file check of the AuthenicatedFileHandler by going up to
        # the tornado.web.StaticFileHandler.
        return super(AuthenticatedFileHandler, self).validate_absolute_path(root, absolute_path)


def setup_handlers(web_app, root_dir):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(base_url, "jupyterlab-custom-order", f"customorder{path_regex}")
    handlers = [(route_pattern, FileOrderHandler, {"path": root_dir})]
    web_app.add_handlers(host_pattern, handlers)
