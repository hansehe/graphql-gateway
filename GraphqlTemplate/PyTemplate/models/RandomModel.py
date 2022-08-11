from typing import Optional
import random

from PyTemplate.models.BaseModel import BaseModel


class RandomModel(BaseModel):
    def __init__(self, **kwargs):
        kwargs.setdefault('number', random.random())

    number: Optional[float] = None
