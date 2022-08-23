from typing import Dict
import logging

import graphene
from graphene_plugin import patch_object_type

from PyTemplate.graphql import AuthResolver
from PyTemplate.models.RandomModel import RandomModel

patch_object_type()
log = logging.getLogger(__name__)


def GetRandomProps() -> Dict[str, graphene.Scalar]:
    return {
    }


class Random(graphene.ObjectType[RandomModel]):
    number = graphene.Float(description="Random number.")

    @staticmethod
    def resolve(info, **kwargs) -> Dict[str, any]:
        user = AuthResolver.AssertAuth(info)
        return RandomModel().Dump()
