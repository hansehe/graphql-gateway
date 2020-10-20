# Graphql Gateway

## Introduction

The graphql gateway service is a graphql gateway to multiple backend graphql providers.
It is implemented with the graphql [federation specification](https://www.apollographql.com/docs/apollo-server/api/apollo-federation/).
Original source code is here:
- https://github.com/hansehe/graphql-gateway

Please also look at this graphql federation demo:
- https://github.com/apollographql/federation-demo

## Installing the Chart

To install the chart with the release name `graphql-gateway` run:

```bash
$ helm repo add graphql-gateway https://raw.githubusercontent.com/hansehe/graphql-gateway/master/helm/charts
$ helm install graphql-gateway \
--set environmentVariables.GRAPHQL_URL_0=http://service_1/graphql \
--set environmentVariables.GRAPHQL_URL_1=http://service_2/graphql \
graphql-gateway/graphql-gateway
```

Alternatively, a YAML file that specifies the values for the parameters can be provided while installing the chart. For example,

```bash
$ helm install graphql-gateway -f values.yaml graphql-gateway/graphql-gateway
```

## Configuration

Find all possible configuration values here:
- https://github.com/hansehe/graphql-gateway/blob/master/helm/graphql-gateway/values.yaml
