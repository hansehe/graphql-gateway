# Graphql Gateway

[![Artifact HUB](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/graphql-gateway)](https://artifacthub.io/packages/search?repo=graphql-gateway)

The graphql gateway service is a graphql gateway to multiple backend graphql providers.
It is implemented with the graphql [federation specification](https://www.apollographql.com/docs/apollo-server/api/apollo-federation/).
Original source code is here:
- https://github.com/graphql-services/graphql-gateway

Please also look at this graphql federation demo:
- https://github.com/apollographql/federation-demo

## Run With Docker Or Docker Compose
```bash
docker run --rm -p 8080:80 -e GRAPHQL_URL_0=https://api.graphloc.com/graphql hansehe/graphql-gateway
```

```bash
# Set GRAPHQL_URL_0 environment variable first..
docker-compose -f docker-compose.yml up
```
Access graphql playground api at: 
- http://localhost:8181/graphql/

## Use Helm Repo
```bash
helm repo add graphql-gateway 'https://raw.githubusercontent.com/hansehe/graphql-gateway/master/helm/charts'
helm repo update
helm repo list
```
