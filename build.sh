#!/usr/bin/env bash
set -o xtrace
set -o errexit

minikube config set WantUpdateNotification false
eval $(minikube docker-env)

cd "$(dirname "${0}")"
script_root="${PWD}"

docker build -t jstangroome/clair-cli ./

kubernetes_ip=$(minikube ip)
clair_port=30060

root_layer=sha256:75a822cd7888e394c49828b951061402d31745f596b1f502758570f2d0ee79e2
#curl -sS -XDELETE "http://${kubernetes_ip}:${clair_port}/v1/layers/${root_layer}"

docker run --rm -e CLAIR_HOSTNAME="${kubernetes_ip}" -e CLAIR_PORT="${clair_port}" -i jstangroome/clair-cli node:6.9
