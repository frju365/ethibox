.PHONY: install run build test
.SILENT:

package-charts:
	@ command -v helm > /dev/null 2>&1 || (echo "helm is not available please install" && exit 1)
	@ helm package ./charts/charts/* -d ./charts/packages/
	@ helm repo index ./charts/packages/

deploy: build
	@ docker build -t ston3o/ethibox .
	@ docker push ston3o/ethibox
