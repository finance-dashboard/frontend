IMAGE=docker.io/iskorotkov/finance-dashboard-frontend:v0.1.0

build-dev:
	docker build -f build/dev.dockerfile -t $(IMAGE)-dev .

push-dev:
	docker push $(IMAGE)-dev
