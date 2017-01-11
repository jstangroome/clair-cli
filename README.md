# Clair CLI

An experiment to provide a command-line interface to [Clair] container vulnerability scanner.

[Clair]: https://github.com/coreos/clair

## Example usage

### Kubernetes

1. Launch a Kubernetes locally with [minikube]
1. Provision [Clair on Kubernetes](https://github.com/coreos/clair#kubernetes)
1. `docker run --rm jstangroome/clair-cli`

[minikube]: https://github.com/kubernetes/minikube