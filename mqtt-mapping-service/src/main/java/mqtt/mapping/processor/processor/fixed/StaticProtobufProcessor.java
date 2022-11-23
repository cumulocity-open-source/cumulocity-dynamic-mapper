package mqtt.mapping.processor.processor.fixed;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.joda.time.DateTime;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.FloatNode;
import com.fasterxml.jackson.databind.node.TextNode;
import com.google.protobuf.InvalidProtocolBufferException;

import lombok.extern.slf4j.Slf4j;
import mqtt.mapping.core.C8YAgent;
import mqtt.mapping.model.MappingSubstitution.SubstituteValue;
import mqtt.mapping.model.MappingSubstitution.SubstituteValue.TYPE;
import mqtt.mapping.processor.BasePayloadProcessor;
import mqtt.mapping.processor.ProcessingException;
import mqtt.mapping.processor.model.MappingType;
import mqtt.mapping.processor.model.ProcessingContext;
import mqtt.mapping.processor.model.RepairStrategy;
import mqtt.mapping.service.MQTTClient;

@Slf4j
@Service
public class StaticProtobufProcessor extends BasePayloadProcessor<byte[]> {

    public StaticProtobufProcessor(ObjectMapper objectMapper, MQTTClient mqttClient, C8YAgent c8yAgent) {
        super(objectMapper, mqttClient, c8yAgent);
    }

    @Override
    public ProcessingContext<byte[]> deserializePayload(ProcessingContext<byte[]> context, MqttMessage mqttMessage)
            throws IOException {
        context.setPayload(mqttMessage.getPayload());
        return context;
    }

    @Override
    public void extractFromSource(ProcessingContext<byte[]> context)
            throws ProcessingException {
        if (MappingType.PROTOBUF_STATIC.equals(context.getMapping().mappingType)) {
            StaticCustomMeasurementOuter.StaticCustomMeasurement payloadProtobuf;
            try {
                payloadProtobuf = StaticCustomMeasurementOuter.StaticCustomMeasurement
                        .parseFrom((byte[]) context.getPayload());
            } catch (InvalidProtocolBufferException e) {
                throw new ProcessingException(e.getMessage());
            }
            Map<String, List<SubstituteValue>> postProcessingCache = context.getPostProcessingCache();

            postProcessingCache
                    .put("time",
                            new ArrayList<SubstituteValue>(
                                    Arrays.asList(new SubstituteValue(
                                            new TextNode(new DateTime(
                                                    payloadProtobuf.getTimestamp())
                                                    .toString()),
                                            TYPE.TEXTUAL,
                                            RepairStrategy.DEFAULT))));
            postProcessingCache.put("c8y_GenericMeasurement.Module.value",
                    new ArrayList<SubstituteValue>(Arrays.asList(
                            new SubstituteValue(new FloatNode(payloadProtobuf.getValue()),
                                    TYPE.NUMBER,
                                    RepairStrategy.DEFAULT))));
            postProcessingCache
                    .put("type",
                            new ArrayList<SubstituteValue>(
                                    Arrays.asList(
                                            new SubstituteValue(
                                                    new TextNode(payloadProtobuf
                                                            .getMeasurementType()),
                                                    TYPE.TEXTUAL,
                                                    RepairStrategy.DEFAULT))));
            postProcessingCache.put("c8y_GenericMeasurement.Module.unit",
                    new ArrayList<SubstituteValue>(Arrays.asList(
                            new SubstituteValue(new TextNode(payloadProtobuf.getUnit()),
                                    TYPE.TEXTUAL,
                                    RepairStrategy.DEFAULT))));
            postProcessingCache.put(context.getMapping().targetAPI.identifier,
                    new ArrayList<SubstituteValue>(Arrays.asList(
                            new SubstituteValue(
                                    new TextNode(payloadProtobuf.getExternalId()),
                                    TYPE.TEXTUAL,
                                    RepairStrategy.DEFAULT))));

        }
    }

}