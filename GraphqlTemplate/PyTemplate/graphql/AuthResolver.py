import logging

from graphene.types import context

from PyTemplate import config

log = logging.getLogger(__name__)

DEFAULT_SERVICE_USER = {
    'name': config.DEFAULT_SERVICE_USER,
    'email': config.DEFAULT_SERVICE_EMAIL
}


def AssertAuth(info: {context}, token: str = None) -> dict:
    user = DEFAULT_SERVICE_USER
    try:
        if token is None:
            token = GetTokenFromInfoContext(info)
    except Exception as error:
        if config.AUTH_ALLOW_ALL:
            log.warning(f'Authentication is disabled! - {str(error)}')
        else:
            raise
    return user


def GetTokenFromInfoContext(info: {context}) -> str:
    token = None
    if info.context is not None:
        authorizationKey = 'Authorization'
        if isinstance(info.context, dict):
            token = info.context['headers'].get(authorizationKey, '')
        else:
            token = info.context.headers.get(authorizationKey)
    if token is None:
        raise Exception('Token not provided with Authorization header.')
    return token


def AssertGraphqlSuccess(data: dict) -> None:
    if 'errors' in data:
        errors = data['errors']
        errorMsg = ''.join([errors[i]['message'] for i in range(len(errors)) if 'message' in errors[i]])
        raise Exception(errorMsg)
