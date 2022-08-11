FROM python:3.9-slim as dev

WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt

FROM dev as final

COPY ./main.py ./main.py
COPY ./AssertHealthy.py ./AssertHealthy.py
COPY ./PyTemplate ./PyTemplate

ENV SERVER_PORT=80

ENV RABBITMQ_AMQP_HOSTNAME=rabbitmq
ENV RABBITMQ_MQTT_HOSTNAME=rabbitmq

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s CMD python AssertHealthy.py

ENTRYPOINT python main.py --init && (gunicorn 'PyTemplate.app:Run(False)' -c PyTemplate/configGunicorn.py)
# ENTRYPOINT python main.py --init && (python main.py)
