import { IClientOptions, MqttClient } from "mqtt";

global.URL = require('url').URL;
const mqtt = require('mqtt')

export const updateSchemaWithTimer = async (
    activateUpdateGatewayWithTimer: boolean, 
    updateGatewayInterval: number,
    updateSchema: () => Promise<void>): Promise<NodeJS.Timeout> => {
    
    if (activateUpdateGatewayWithTimer !== true){
        return;
    }

    return setInterval(async () => {
        console.log('Updating schema triggered by timer interval');
        await updateSchema();
    }, updateGatewayInterval);
}

export const updateSchemaWithMqtt = async (
    activateUpdateGatewayWithMqtt: boolean,
    mqttConnectionString: string, 
    mqttSubscriptionTopic: string,
    mqttClientId: string,
    mqttUsername: string | undefined,
    mqttPassword: string | undefined,
    updateSchema: () => Promise<void>): Promise<MqttClient> => {
    
    if (activateUpdateGatewayWithMqtt !== true) {
        return;
    }

    const options: IClientOptions = {
        clientId: mqttClientId + Math.random().toString(16).substr(2, 8),
    }
    if (mqttUsername) {
        options.username = mqttUsername;
    }
    if (mqttPassword) {
        options.password = mqttPassword;
    }

    var verifiedConnection = false;
    var mqttClient = mqtt.connect(mqttConnectionString, options);
    mqttClient.on('connect', function () {
        verifiedConnection = true;
        mqttClient.subscribe(mqttSubscriptionTopic, function (err) {
            if (!err) {
                var msg = `Established mqtt subscription on topic: ${mqttSubscriptionTopic}`;
                if (verifiedConnection) {
                    console.log(msg);
                }
                else {
                    console.debug(msg);
                }
            }
            else {
                console.error(`Failed establishing mqtt subscription on topic: ${mqttSubscriptionTopic}`)
            }
        })
    });

    mqttClient.on('error', (error) => {
        verifiedConnection = false;
        console.error(`Failed connection with mqtt: ${error.message}`);
    });

    mqttClient.on('disconnect', () => {
        verifiedConnection = false;
        console.log(`Disconnecting mqtt`);
    });

    mqttClient.on('offline', () => {
        verifiedConnection = false;
        console.log(`Mqtt went offline`);
    });
        
    mqttClient.on('message', function (topic: string, message: any) {
        console.log('Updating schema triggered by mqtt');
        updateSchema().catch((e) => {
            console.error(e);
        });
    });

    return mqttClient;
}