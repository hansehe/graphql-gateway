# Graphql Gateway

The graphql gateway service is a graphql gateway to multiple backend graphql providers.
It is implemented with the graphql [federation specification](https://www.apollographql.com/docs/apollo-server/api/apollo-federation/).
Original source code is here:
- https://github.com/graphql-services/graphql-gateway

Please also look at this graphql federation demo:
- https://github.com/apollographql/federation-demo

## Run With Docker
- pip install --upgrade DockerBuildManagement
    - https://github.com/DIPSAS/DockerBuildManagement
- dbm -run
  - Access graphql playground api at: 
    - http://localhost:8181/graphql/

## Use Helm Repo
```bash
helm repo add graphql-gateway 'https://raw.githubusercontent.com/hansehe/graphql-gateway/master/helm/charts'
helm repo update
helm repo list
```
