import logging

import requests

from PyTemplate import config

logging.basicConfig(format=config.LOG_FORMAT, level=config.LOG_LEVEL)
log = logging.getLogger(__name__)


def AssertHealthy() -> None:
    url = f'http://localhost:{config.SERVER_PORT}/status/health'
    response: dict = requests.get(url).json()
    if response['status'] == 'success':
        msg = f'Service is healthy.'
        log.debug(msg)
    else:
        msg = f'Service is unhealthy!'
        log.error(msg)
        raise Exception(msg)


if __name__ == "__main__":
    AssertHealthy()
