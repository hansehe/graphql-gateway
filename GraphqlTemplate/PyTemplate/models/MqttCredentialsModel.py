from typing import Optional

from PyTemplate.models.BaseModel import BaseModel
from PyTemplate import config


class MqttCredentialsModel(BaseModel):
    def __init__(self, **kwargs):
        kwargs.setdefault('username', config.RABBITMQ_MQTT_USER)
        kwargs.setdefault('password', config.RABBITMQ_MQTT_PASSWORD)
        kwargs.setdefault('virtualHost', config.RABBITMQ_MQTT_VIRTUAL_HOST)
        super().__init__(**kwargs)

    username: Optional[str] = None
    password: Optional[str] = None
    virtualHost: Optional[str] = None

