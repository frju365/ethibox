.PHONY: install run build test
.SILENT:

enter:
	@ command -v telepresence > /dev/null 2>&1 || (echo "telepresence is not available please install" && exit 1)
	@ command -v kubectl > /dev/null 2>&1 || (echo "kubectl is not available please install" && exit 1)
	@- kubectl --namespace kube-system delete deployment ethibox > /dev/null 2>&1
	@- kubectl --namespace kube-system delete service ethibox > /dev/null 2>&1
	@ telepresence --namespace kube-system --new-deployment ethibox --expose 4444 --run-shell

package-charts:
	@ command -v helm > /dev/null 2>&1 || (echo "helm is not available please install" && exit 1)
	@ helm package ./charts/charts/* -d ./charts/packages/
	@ helm repo index ./charts/packages/

deploy: build
	@ docker build -t ston3o/ethibox .
	@ docker push ston3o/ethibox
