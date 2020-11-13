# Graphql Gateway

[![Artifact HUB](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/graphql-gateway)](https://artifacthub.io/packages/search?repo=graphql-gateway)

The graphql gateway service is a graphql gateway to multiple backend graphql providers.
It is implemented with the graphql [federation specification](https://www.apollographql.com/docs/apollo-server/api/apollo-federation/).

Please also look at this graphql federation demo:
- https://github.com/apollographql/federation-demo

## Run With Docker
```bash
docker run --rm -p 8181:80 -e GRAPHQL_URL_0=http://first-graphql-service/graphql GRAPHQL_URL_1=http://second-graphql-service/graphql hansehe/graphql-gateway
```

Access graphql playground api at: 
- http://localhost:8181/graphql/

## Use Helm Repo
```bash
helm repo add graphql-gateway https://raw.githubusercontent.com/hansehe/graphql-gateway/master/helm/charts
helm repo update
```
```bash
helm install graphql-gateway \
--set environmentVariables.GRAPHQL_URL_0=http://service_1/graphql \
--set environmentVariables.GRAPHQL_URL_1=http://service_2/graphql \
graphql-gateway/graphql-gateway
```

## Development
```bash
# Prerequisites: docker/docker-compose/node/python
# https://pypi.org/project/DockerBuildManagement/
pip install --upgrade DockerBuildManagement
dbm -swarm -start
dbm -build -test -run service
# Access graphql gateway (federated schemas of backend 0 and 1) api at: http://localhost:8181/graphql/
# Access graphql backend 0 api at: http://localhost:5000/graphql/
# Access graphql backend 1 api at: http://localhost:5001/graphql/
dbm -swarm -stop
```
