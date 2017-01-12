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

docker run --rm -e CLAIR_HOSTNAME="${kubernetes_ip}" -e CLAIR_PORT="${clair_port}" -i jstangroome/clair-cli node:6.9
