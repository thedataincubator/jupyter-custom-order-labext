SHELL := /bin/bash
VENV := venv
ACTIVATE_VENV := source $(VENV)/bin/activate

.PHONY: all
all: clean build launch

$(VENV)/bin/activate:
	python3 -m venv $(VENV)
	$(ACTIVATE_VENV) && pip install jupyterlab==4.0.0

.PHONY: build
build: $(VENV)/bin/activate
	$(ACTIVATE_VENV) && pip install -e .
	$(ACTIVATE_VENV) && jupyter labextension develop . --overwrite
	$(ACTIVATE_VENV) && jupyter server extension enable jupyterlab_custom_order
	$(ACTIVATE_VENV) && jlpm build

.PHONY: launch
launch:
	$(ACTIVATE_VENV) && jupyter-lab

.PHONY: clean
clean:
	rm -rf \
		.yarn \
		lib \
		jupyterlab_custom_order/_version.py \
		jupyterlab_custom_order/labextension \
		node_modules/ \
		tsconfig.tsbuildinfo \
		$(VENV)

