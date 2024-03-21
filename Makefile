SHELL := /bin/bash
VENV := venv
ACTIVATE_VENV := source $(VENV)/bin/activate
VERSION := $(shell jq -r .version package.json)

.PHONY: all
all: clean build-dev launch

$(VENV)/bin/activate:
	python3 -m venv $(VENV)
	$(ACTIVATE_VENV) && pip install 'jupyterlab>=4.0.0,<5'
	$(ACTIVATE_VENV) && pip install build==1.1.1

.PHONY: build-dev
build-dev: $(VENV)/bin/activate
	$(ACTIVATE_VENV) && pip install -e .
	$(ACTIVATE_VENV) && jupyter labextension develop . --overwrite
	$(ACTIVATE_VENV) && jupyter server extension enable jupyterlab_custom_order
	$(ACTIVATE_VENV) && jlpm build

.PHONY: build-wheel
build-wheel: dist/jupyterlab_custom_order-$(VERSION)-py3-none-any.whl

dist/jupyterlab_custom_order-$(VERSION)-py3-none-any.whl: $(VENV)/bin/activate
	$(ACTIVATE_VENV) && python3 -m build

.PHONY: launch
launch:
	$(ACTIVATE_VENV) && jupyter-lab

.PHONY: clean
clean:
	rm -rf \
		.yarn \
		dist/ \
		lib \
		jupyterlab_custom_order/_version.py \
		jupyterlab_custom_order/labextension \
		node_modules/ \
		tsconfig.tsbuildinfo \
		$(VENV)

