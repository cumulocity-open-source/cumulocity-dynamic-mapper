package mqtt.mapping.configuration;

import com.cumulocity.model.option.OptionPK;
import com.cumulocity.rest.representation.tenant.OptionRepresentation;
import com.cumulocity.sdk.client.SDKException;
import com.cumulocity.sdk.client.option.TenantOptionApi;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class ConnectionConfigurationComponent {
    private static final String OPTION_CATEGORY_CONFIGURATION = "mqtt.dynamic.service";

    private static final String OPTION_KEY_CONNECTION_CONFIGURATION = "credentials.connection.configuration";
    private static final String OPTION_KEY_SERVICE_CONFIGURATION = "service.configuration";

    private final TenantOptionApi tenantOptionApi;


    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    public ConnectionConfigurationComponent(TenantOptionApi tenantOptionApi) {
        this.tenantOptionApi = tenantOptionApi;
    }

    public void saveConnectionConfiguration(final ConfigurationConnection configuration) throws JsonProcessingException {
        if (configuration == null) {
            return;
        }

        final String configurationJson = objectMapper.writeValueAsString(configuration);
        final OptionRepresentation optionRepresentation = new OptionRepresentation();
        optionRepresentation.setCategory(OPTION_CATEGORY_CONFIGURATION);
        optionRepresentation.setKey(OPTION_KEY_CONNECTION_CONFIGURATION);
        optionRepresentation.setValue(configurationJson);

        tenantOptionApi.save(optionRepresentation);
    }

    public ConfigurationConnection loadConnectionConfiguration() {
        final OptionPK option = new OptionPK();
        option.setCategory(OPTION_CATEGORY_CONFIGURATION);
        option.setKey(OPTION_KEY_CONNECTION_CONFIGURATION);
        try {
            final OptionRepresentation optionRepresentation = tenantOptionApi.getOption(option);
            final ConfigurationConnection configuration = new ObjectMapper().readValue(optionRepresentation.getValue(), ConfigurationConnection.class);
            log.debug("Returning connection configuration found: {}:", configuration.mqttHost );
            return configuration;
        } catch (SDKException exception) {
            log.error("No configuration found, returning empty element!");
            //exception.printStackTrace();
        } catch (JsonMappingException e) {
            e.printStackTrace();
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }
        return null;
    }

    public void deleteAllConfiguration() {
        final OptionPK optionPK = new OptionPK();
        optionPK.setCategory(OPTION_CATEGORY_CONFIGURATION);
        optionPK.setKey(OPTION_KEY_CONNECTION_CONFIGURATION);
        tenantOptionApi.delete(optionPK);
        optionPK.setKey(OPTION_KEY_SERVICE_CONFIGURATION);
        tenantOptionApi.delete(optionPK);
    }

    public ConfigurationConnection enableConnection(boolean enabled) {
        final OptionPK option = new OptionPK();
        option.setCategory(OPTION_CATEGORY_CONFIGURATION);
        option.setKey(OPTION_KEY_CONNECTION_CONFIGURATION);
        try {
            final OptionRepresentation optionRepresentation = tenantOptionApi.getOption(option);
            final ConfigurationConnection configuration = new ObjectMapper().readValue(optionRepresentation.getValue(), ConfigurationConnection.class);
            configuration.enabled = enabled;
            log.debug("Setting connection: {}:", configuration.enabled );
            final String configurationJson = new ObjectMapper().writeValueAsString(configuration);
            optionRepresentation.setCategory(OPTION_CATEGORY_CONFIGURATION);
            optionRepresentation.setKey(OPTION_KEY_CONNECTION_CONFIGURATION);
            optionRepresentation.setValue(configurationJson);
            tenantOptionApi.save(optionRepresentation);
            return configuration;
        } catch (SDKException exception) {
            log.warn("No configuration found, returning empty element!");
            //exception.printStackTrace();
        } catch (JsonMappingException e) {
            e.printStackTrace();
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }
        return null;
    }

}