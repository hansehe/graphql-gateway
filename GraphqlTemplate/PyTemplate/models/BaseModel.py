from typing import Dict

from pydantic import BaseModel as pyBaseModel


class BaseModel(pyBaseModel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    class Config:
        arbitrary_types_allowed = True

    def Dump(self) -> Dict[str, any]:
        data = self.dict(exclude_unset=True)
        return data
