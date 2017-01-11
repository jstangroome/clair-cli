#!/usr/bin/env bash
set -o xtrace
set -o errexit

eval $(minikube docker-env)

cd "$(dirname "${0}")"
script_root="${PWD}"

case "$(uname)" in
  CYGWIN*)
    cygwin=1
    ;;
  *)
    cygwin=0
    ;;
esac

external_script_root="${script_root}"
if [ "1" == "${cygwin}" ]
then
  external_script_root=$(cygpath -am "${script_root}")
fi

docker build -t jstangroome/clair-cli ./ # "${external_script_root}"

docker run --rm -i jstangroome/clair-cli
