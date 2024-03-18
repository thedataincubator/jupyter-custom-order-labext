SHELL := /bin/bash
VENV := venv
ACTIVATE_VENV := source $(VENV)/bin/activate

.PHONY: all
all: clean build

$(VENV)/bin/activate:
	python3 -m venv $(VENV)
	$(ACTIVATE_VENV) && pip install jupyterlab==4.0.0

.PHONY: build
build: $(VENV)/bin/activate
	$(ACTIVATE_VENV) && pip install -e .
	$(ACTIVATE_VENV) && jlpm build

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

