# Dynamic Mapping Service for Cumulocity

## Table of Contents
- [Overview](#overview)
- [Installation Guide ](#installation-guide)
- [Build & Deploy](#build--deploy)
- [User Guide](#user-guide)
- [API Documentation](#api-documentation)
- [Tests & Sample Data](#tests--sample-data)
- [Setup Sample mappings](#setup-sample-mappings)
- [Enhance and Extensions](#enhance-and-extensions)

## Overview

The Cumulocity Dynamic Mapper addresses the need to get **any** data provided by a message broker mapped to the Cumulocity IoT Domain model in a zero-code approach.
It can connect to multiple message brokers likes **MQTT**, **MQTT Service** , **Kafka** and others, subscribes to specific topics and maps the data in a graphical editor to the domain model of Cumulocity.

Per default the followings connectors are supported
* **MQTT** - any MQTT Broker
* **MQTT Service** - MQTT Broker 
* **Kafka** - Kafka Broker

The solution is compposed of two major components:

* A **microservice** - exposes REST endpoints, provides a generic connector interface which can be used by broker clients to
connect to a message broker, a generic data mapper, a comprehensive expression language for data mapping and the
[Cumulocity Microservice SDK](https://cumulocity.com/guides/microservice-sdk/introduction/) to connect to Cumulocity. It also supports multi tenancy.

* A **frontend (plugin)** - uses the exposed endpoints of the microservice to configure a broker connection & to perform 
graphical data mappings within the Cumumlocity IoT UI.

Using the Cumulocity Dynamic Mapper you are able to connect to almost any message broker and map any payload on any topic dynamically to
the Cumulocity IoT Domain Model in a graphical editor.

Here are the **core features** summarized:

* **Connect** to multiple message broker of your choice at the same time.
* **Map** any data to/from the Cumulocity IoT Domain Model in a graphical way.
* **Bidirectional mappings** are supported - so you can forward data to Cumulocity or subscribe on Cumulocity data and forward it to the broker
* **Transform** data with a comprehensive expression language supported by [JSONata](https://jsonata.org/) 
* **Multiple payload formats** are supported, starting with **JSON**, **Protobuf**, **Binary**, **CSV**.
* **Extend**  the mapper easily by using payload extensions or the provided connector interface
* Full support of **multi-tenancy** - deploy it in your enterprise tenant and subscribe it to sub-tenants.

<br/>
<p align="center">
<img src="resources/image/Dynamic_Mapper_Mapper.jpg"  style="width: 80%;" />
</p>
<br/>

### Architecture
The architecture of the components consists of the following components:

<p align="center">
<img src="resources/image/Dynamic_Mapper_Architecture.png"  style="width: 100%;" />
</p>
<br/>
The light blue components are part of this project which are:

* three default connectors for..
  * **MQTT client** - using [hivemq-mqtt-client](https://github.com/hivemq/hivemq-mqtt-client) to connect and subscribe to MQTT brokers
  * **MQTT Service client** - using hivemq-mqtt-client to connect to MQTT Service
  * **Kafka connector** - to connect to Kafka brokers
* **Data mapper** - handling of received messages via connector and mapping them to a target data format for Cumulocity IoT. 
Also includes an expression runtime [JSONata](https://jsonata.org) to execute expressions
* **C8Y client** - implements part of the Cumulocity IoT REST API to integrate data
* **REST endpoints** - custom endpoints which are used by the MQTT Frontend or can be used to add mappings programmatically
* **Mapper frontend** - A plugin for Cumulocity IoT to provide an UI for MQTT Configuration & Data Mapping

> **Please Note:** When using MQTT or any other Message Broker beside MQTT Service you need to provide this broker available yourself to use the Dynamic Mapper.

The mapper processes messages in both directions:
1. `INBOUND`: from Message Broker to C8Y
2. `OUTBOUND`: from C8Y to Message Broker

The Dynamic Mapper can be deployed as a **multi tenant microservice** which means you can deploy it once in your enterprise tenant and subscribe additional tenants using the same hardware resources.
It is also implemented to support **multiple broker connections** at the same time. So you can combine multiple message brokers sharing the same mappings.
This implies of course that all of them use the same topic structure and payload otherwise the mappings will fail.

### Known Limitation and Disclaimer

As we already have a very good C8Y API coverage for mapping not all complex cases might be supported. Currently, the 
following Mappings are supported:

* inventory
* events
* measurements
* alarms
* operations (outbound to devices)

A mapping is defined of mapping properties and substitutions. The substitutions are mapping rules copying date from the incoming payload to the payload in the target system. These substitutions are defined using the standard JSONata as JSONata expressions. These JSONata expressions are evaluated in two different libraries:
1. `dynamic-mapping`: (nodejs) [npmjs JSONata](https://www.npmjs.com/package/jsonata) and
2. `dynamic-mapping-service` (java): [JSONata4Java](https://github.com/IBM/JSONata4Java)
Please be aware that slight in differences in the evaluation of these expressions exist.

Differences in more advanced expressions can occur. Please test your expressions before you use advanced elements.

### Contribution
> **Pull Requests adding connectors, mappings for other data formats or additional functionally are welcomed!**

## Installation Guide

### Prerequisites

In your Cumulocity IoT Tenant you must have the **microservice** feature subscribed. Per default this feature is not
available and must be provided by administrators of the instance you are using.

Make sure to use a user with admin privileges in your Tenant.

### Installation

You need to install two components to your Cumulocity IoT Tenant:

1. microservice - (Java)
2. web app plugin - (angular/Cumulocity WebSDK)

Both are provided as binaries in [releases](https://github.com/SoftwareAG/cumulocity-generic-mqtt-agent/releases). Download 
the binaries from the latest release and upload them to your Cumulocity IoT Tenant.

#### Microservice

In your Enterprise Tenant or Tenant navigate to "Administration" App, go to "Ecosystem" -> "Microservices" and click on "Add Microservice" on the top right.

Select the `dynamic-mapping-service.zip`.
Make sure that you subscribe the microservice to your tenant when prompted

#### Web app plugin

#### Community store

The Web App Plugin is part of the community plugins and should be available directly in your Tenant under
"Administration" -> "Ecosystem" -> "Extensions". Just click on "dynamic-mapping" and click on "install plugin".

> **_NOTE:_** We need to clone the Administration app to add the plugin to it

After successful upload go to "All Applications" and click on "Add Application". Select "Duplicate existing application" and afterward "Administration".

<p align="center">
<img src="resources/image/Generic_Mapping_DuplicateApp.png" style="width: 40%;" />
</p>
<br/>

Now select the cloned Administration App and go to the "Plugin" Tab. Click on "Install Plugin" and select "MQTT configuration plugin"

<p align="center">
<img src="resources/image/Generic_Mapping_PluginInstalled.png" style="width: 50%;" />
</p>
<br/>

#### Manual
If you made changes or your want to upload the plugin manually you can do that by following these steps:

1. In "Administration" App go to "Ecosystem" -> "Packages" and click on "Add Application" on the top right.
2. Select `dynamic-mapping.zip` and wait until it is uploaded.

Follow the steps from the point above to assign the plugin to your Administration App.

## Build & Deploy

### Prerequisites
Make sure that [Docker](https://www.docker.com/), [Apache Maven](https://maven.apache.org/) and [Node.js](https://nodejs.org/) are installed and running on your computer.

### Backend - Microservice
Run `mvn clean package` in folder `dynamic-mapping-service` to build the Microservice which will create a ZIP archive you can upload to Cumulocity.
Just deploy the ZIP to the Cumulocity Tenant like described [here](https://cumulocity.com/guides/users-guide/administration/#uploading-microservices).

### Frontend - Plugin
Run `npm run build` in folder `dynamic-mapping` to build the Front End (plugin) for the Administration which will build a plugin.
Run `npm run deploy` in folder `dynamic-mapping` to deploy the Front End (plugin) to your Cumulocity tenant.
The Frontend is build as [Cumulocity plugin](https://cumulocity.com/guides/web/tutorials/#add-a-custom-widget-with-plugin).

## User Guide

### Permissions
The solution differentiates between two different roles:
1. `ROLE_MAPPING_ADMIN`: can use/access all tabs, including **Configuration**, **Processor Extension**. In addition, the relevant endpoints in `MappingRestController`:

   1.1. `POST /configuration/connection`

   1.2. `POST /configuration/service`

   1.3 `DELETE /extension/{extensionName}`

   are accessible.
2. `ROLE_MAPPING_CREATE`: can't use/access tabs **Configuration**, **Processor Extension**.

The two roles have to be assigned in the Web UI **Adminisitration**, see [here](https://cumulocity.com/guides/users-guide/administration/#managing-permissions).

The available tabs for `ROLE_MAPPING_ADMIN` are as follows:
![ROLE_MAPPING_ADMIN](./resources/image/Generic_Mapping_UI_AdminRole_Tabs.png)

The available tabs for `ROLE_MAPPING_CREATE` are as follows:
![ROLE_MAPPING_CREATE](./resources/image/Generic_Mapping_UI_CreateRole_Tabs.png)

### Configuration connector to broker

The configurations are persisted as tenant options in the Cumulocity Tenant and can be manged using the following UI.\
The table of configured connectors to different brokers can be:
* deleted
* enabled / disabled
* updated / copied

<p align="center">
<img src="resources/image/Generic_Mapping_Connector_Overview.png"  style="width: 70%;" />
</p>
<br/>

Furthermore, new connectors can be added. The UI is shown on the following screenshot. In the modal dialog you have to first select the type of connector. Currently we support the following connectors:
* MQTT:  supports connections to MQTT version 3.1.1 over websocket and tcp
* MQTT Service: this connector is a special case of the MQTT connector, to connect to the Cumulocity MQTT Service
* Kafka: is an initial implementation for connecting to Kafka brokers. It is expected that the implementation of the connector has to be adapted to the specific needs of your project. This applies to configuration for security, transactions, key and payload serialization ( currently StringSerializer)...

The configuration properties are dynamically adapted to the configuration parameter for the chosen connector type:

<p align="center">
<img src="resources/image/Generic_Mapping_Connector_Edit.png"  style="width: 70%;" />
</p>
<br/>

The settings for the Kafka connector can be seen on the following screenshot:

<p align="center">
<img src="resources/image/Generic_Mapping_Connector_Edit.png"  style="width: 70%;" />
</p>
<br/>


When you add or change a connection configuration it happens very often that the parameter are incorrect and the connection fails. In this case the connection to the MQTT broker cannot be established and the reason is not known. To identify the incorrect parameter you can follows the error messages in the connections logs on the same UI:
<p align="center">
<img src="resources/image/Generic_Mapping_Connector_Monitoring.png"  style="width: 70%;" />
</p>
<br/>

### Definition and Activation of  mappings

#### Table of mappings

Once the connection to a broker is configured and successfully enabled you can start defining mappings. The mappings table is the entry point for:
1. Creating new mappings: Press button `Add mapping`
2. Updating existing mapping: Press the pencil in the row of the relevant mapping
3. Deleting existing mapping: Press the "-" icon in the row of the relevant mapping to delete an existing mappings
4. Importing new mappings
5. Exporting defined mappings

To change a mapping it has to be deactivated.After changes are made the mapping needs to be activated again. The updated version of the mapping is deployed automatically and applied immediately when new messages are sent to the configure mapping topic.

#### Define mappings from source to target format (Cumulocity REST format)

Mappings are persisted as Managed Objects and can be easily changed, deleted or migrated.

##### Expression Language

In addition to using plain properties of the source payload, you can apply functions on the payload properties. This covers a scenario where a device name should be a combination of a generic name and an external device Id.
Complex mapping expressions are supported by using [JSONata](https://jsonata.org). \
In this case the following function could be used:
```$join([device_name, id])```. 

Further example for JSONata expressions are:
* to convert a UNIX timestamp to ISO date format use:
      <code>$fromMillis($number(deviceTimestamp))</code>
* to join substring starting at position 5 of property <code>txt</code> with device
      identifier use: <code>$join([$substring(txt,5), "-", id])</code>

>**_NOTE:_**
> * escape properties with special characters with <code>`</code>. The property
        <code>customer-1</code> becomes <code>`customer-1`</code>
> * function chaining using <code>~></code> is not supported, instead use function
        notation. The expression <code>Account.Product.(Price * Quantity) ~> $sum()</code>
        becomes <code>$sum(Account.Product.(Price * Quantity))</code>

#### Wizard to define a mapping

Creation of the new mapping starts by pressing `Add Mapping`. On the next modal UI you can choose the mapping type depending on the structure of your payload. Currently there is support for:
1. `JSON`: if your payload is in JSON format
1. `FLAT_FILE`: if your payload is in a CSV format
1. `GENERIC_BINARY`: if your payload is in HEX format
1. `PROTOBUF_STATIC`: if your payload is a serialized protobuf message
1. `PROCESSOR_EXTENSION`: if you want to process the message yourself, by registering a processor extension


<p align="center">
<img src="resources/image/Generic_Mapping_AddMapping.png"  style="width: 70%;" />
</p>
<br/>

The wizard to define a mapping consists of the steps:

1. Select the type of mapping:
* `JSON`
* `FLAT_FILE`
* `GENERIC_BINARY`
* `PROTOBUF_STATIC`
* `PROCESSOR_EXTENSION`
___
  **NOTE:**
Payload for ```FLAT_FILE``` and ```GENERIC_BINARY``` are wrapped.
For example for a flat file messages:

```
{
  "message": "oil,100,1666863595",
}
```
You can use the JSONata function ```$split(str, separator)``` for splitting the payload, e.g:
```
$split(message,",")[1]
```
splits the payload and return the second field: ```100```.

And for the binary payload is encoded as hex string:
```
{
  "message": "0x575",
}
```
Using appropriate JSONata expression you can parse the payload:
```
$number(message) & " C"
```

> **Please Note:** Currently this works only with a pached version of the [JSONata library](https://github.com/IBM/JSONata4Java)  due to the missing support for hexadecimal number in the current in the original version. The original implementation of the `$number()` function only works for decimal numbers. An [issue](https://github.com/IBM/JSONata4Java/issues/305) is pending for resolution.
The JSONata function `$parseInteger()` is not supported by [JSONata library](https://github.com/IBM/JSONata4Java) and can't be used.

___

1. Define the properties of the topic and API to be used
2. Define the templates for the source and target, in JSON format. The source payload can be in any custom JSON format. the target format has to follow the schemsa for Alarm, Events, Measurements or Inventory, [see Cumulocity OpenAPI](https://cumulocity.com/api/).
3. Test the mapping by applying the transformation and send the result to a test device.

##### Define topic properties

In the first wizard step properties for the topic are defined.
<p align="center">
<img src="resources/image/Generic_Mapping_TopicDefinition.png"  style="width: 70%;" />
</p>
<br/>

For the mappings we differentiate between a **subscription topic** and a **template topic**:

For outbound mappings the properties are slightly different. Most important are the properties:
1. `filterOutbound`: The Filter Outbound can contain one fragment name to associate a
                      mapping to a Cumulocity MEAO. If the Cumulocity MEAO contains this fragment, the mapping is
                      applied.
2. `publishTopic`: MQTT topic to publish outbound messages to.

<p align="center">
<img src="resources/image/Generic_Mapping_TopicDefinition_Outbound.png"  style="width: 70%;" />
</p>
<br/>

For an outbound mapping to be applied two conditions have to be fulfilled: 
1. the Cumulocity MEAO message has to have a fragment that is defined in property `filterOutbound`
2. for the device a Notification 2.0 subscription has to be created. This is done using the following dialog:
<p align="center">
<img src="resources/image/Generic_Mapping_MappingTemplate_Outbound_subscription.png"  style="width: 70%;" />
</p>
<br/>

##### Subscription Topic

This is the topic which is actually subscribed on in the broker. It can contain wildcards, either single level "+" or multilevel "#".
This must be supported by the configured message broker.
>**_NOTE:_** Multi-level wildcards can only appear at the end of topic. The topic "/device/#/west" is not valid.
Examples of valid topics are: "device/#", "device/data/#", "device/12345/data" etc.

##### Mapping Topic

The template topic is the key of the persisted mapping. The main difference to the subscription topic is that
a template topic can have a path behind the wildcard for the reason as we can receive multiple topics on a wildcard which might be mapped differently.\
Examples are: "device/+/data, "device/express/+", "device/+"\
In order to use sample data instead of the wildcard you can add a Mapping Topic Sample, which must have the same structure, i.e. same level in the topic and when explicit name are used at a topic level in the Mapping Topic they must exactly be the same in the Mapping Topic Sample.

<p align="center">
<img src="resources/image/Generic_Mapping_Diagram_Map.png"  style="width: 70%;" />
</p>
<br/>

The levels of the Mapping Topic are split and added to the payload:
```
  "_TOPIC_LEVEL_": [
    "device",
    "express",
    "berlin_01"
  ]
```
The entries in the ```_TOPIC_LEVEL_``` can be used to resolve the external device identifier to the internal Cumulocity Id.
The additional property ```_TOPIC_LEVEL_``` is added to the source template shown in the next wizard step. It must not be deleted when editing the JSON source template.

##### Snooping payloads on source topic

Very often you want to use the payloads of existing JSON messages as a sample to define the source template. This can be achieved by listening and recording - **snooping** - messages on a topic.

In order to record JSON payloads on the defined topic a subscription records the payloads and saves them for later use in a source template.

The snooping process goes through the steps **ENABLED** -> **STARTED** -> **STOPPED**.

If a payload is found the status moves to **STARTED**. This is indicated in the last column of the mapping table, where the number of payloads snooped so far is shown.

##### Enable snooping payloads on source topic

To enable snooping select ```ENABLED``` in the drop down as shown in the screenshot below. This starts the snooping process and the microservice subscribes to the related topic and records the received payloads.


<p align="center">
<img src="resources/image/Generic_Mapping_EnableSnooping.png"  style="width: 70%;" />
</p>
<br/>

##### Map Device Identifier

Connected devices send their data using an external device identifier, e.g. IMEI, serial number, ... In this case the external id has to be used for looking to the device id used by Cumulocity. To achieve this the entries in the ```_TOPIC_LEVEL_``` can be used to resolve the external device identifier to an internal Cumulocity id. When a payload from this device arrives at runtime the external id is used to lookup the corresponding internal Cumulocity id with the help of a external id type.


##### Define templates and substitutions for source and target payload

In the second wizard step, shown on the screenshot below the mapping is further defined:
1. Editing the source template directly
2. Editing the target template directly


<p align="center">
<img src="resources/image/Generic_Mapping_MappingTemplate.png"  style="width: 70%;" />
</p>
<br/>

In order to define a substitution (a substitution substitutes values in the target payload with values extracted at runtime from the source payload), the UI offers the following feaoptionstures:
1. Add new substitution by pressing button "Add substitution". Further details for the substitution can be defined in the next modal dialog. See as well the next paragraph.
2. Update an existing substitution, by selecting the substitution in the table of substitutions in the lower section of the wizard. Then press button  "Update substitution" 
3. Delete an existing substitution, by pressing the button with the red minus

<p align="center">
<img src="resources/image/Generic_Mapping_MappingTemplate_annnotated.png"  style="width: 70%;" />
</p>
<br/>

To define a new substitution the following steps have to be performed:
1. Select a property in the source JSON payload by click on the respective property. Then the JSONpath is appears in the field with the label ```Evaluate Expression on Source```
1. Select a property in the target JSON payload by click on the respective property. Then the JSONpath is appears in the field with the label ```Evaluate Expression on Target```
>**_NOTE:_** Use the same <a href="https://jsonata.org" target="_blank">JSONata</a>
              expressions as in the source template. In addition you can use <code>$</code> to merge the 
              result of the source expression with the existing target template. Special care is 
              required since this can overwrite mandatory Cumulocity attributes, e.g. <code>source.id</code>.  This can result in API calls that are rejected by the Cumulocity backend!

3. Press the button "Add substitution". In the next modal dialog the following details can be specified:
   1. Select option ```Expand Array``` if the result of the source expression is an array and you want to generate any of the following substitutions:
      * ```multi-device-single-value```
      * ```multi-device-multi-value```
      * ```single-device-multi-value```\
  Otherwise an extracted array is treated as a single value, see [Different type of substitutions](#different-type-of-substitutions).
   1. Select option ```Resolve to externalId``` if you want to resolve system Cumulocity Id to externalId using externalIdType. This can only be used for OUTBOUND mappings.
   1. Select a ```Reapir Strategy``` that determines how the mapping is applied:
      *  ```DEFAULT```: Map the extracted values to the attribute addressed on right side
      *  ```USE_FIRST_VALUE_OF_ARRAY```: When the left side of the mapping returns an array, only use the 1. item in the array and map this to the right side
      *  ```USE_LAST_VALUE_OF_ARRAY```: When the left side of the mapping returns an array, only use the last item in the array and map this to the right side
      *  ```REMOVE_IF_MISSING```: When the left side of the mapping returns no result (not NULL), then delete the attribute (that is addressed in mapping) in the target on the right side. This avoids empty attribute, e.d. ```airsensor: undefined```
      *  ```REMOVE_IF_NULL```: When the left side of the mapping returns ```null```, then delete the attribute (that is addressed in mapping) in the target on the right side. This avoids empty attribute, e.d. ```airsensor: undefined```
<p align="center">
<img src="resources/image/Generic_Mapping_MappingTemplate_EditModal.png"  style="width: 70%;" />
</p>
<br/>

>**_NOTE:_** When adding a new substitution the following two consistency rules are checked:
>1. Does another substitution for the same target property exist? If so, a modal dialog appears and asks the user for confirmation to overwrite the existing substitution.
>2. If the new substitution defines the device identifier, it is checked if another substitution already withe the same property exists. If so, a modal dialog appears and asks for confirmation to overwrite the existing substitution.


To avoid inconsistent JSON being sent to the Cumulocity API the defined target tmeplate are validated with schemas. These are defined for all target payloads (Measurement, Event, Alarm, Inventory). The schemas validate if required properties are defined and if the time is in the correct format.

In the sample below, e.g. a warning is shown since the required property ```source.id``` is  missing in the payload.


<p align="center">
<img src="resources/image/Generic_Mapping_MappingTemplate_SchemaValidation_annnotated.png"  style="width: 70%;" />
</p>
<br/>

##### Different type of substitutions
When you define an expression or a path in the source payload for a substitution the result can be one of the following cases:
1. **if** the result is a scalar value, e.g. ```10.4``` for a single value **and**
     * **if** only one device is identified in the payload \
      **then** only one Cumulocity MEA-request is generated from this payload.\
     This is a **single-device-single-value** mapping.
     * **if** multiple devices are identified, e.g. ```["device_101023", "device_101024"]``` in the payload \
      **then** multiple Cumulocity MEA-requests or inventory requests - depending on the used targetAPI in the mapping - are generated from this payload. This only makes sense for creating multiple devices.\
      This is a **multi-device-single-value** mapping.
2. **if** the result is an array, e.g. ```[10.4, 20.9]``` for multiple measurements values **and**
    * **if** multiple devices are identified , e.g. ```["device_101023","device_101024"]``` \
      **then**  multiple Cumulocity MEA-requests are generated from this single payload. In this case two requests: 
      1. request: for device ```"device_101023"``` and value ```10.4```
      2. request: for device ```"device_101024"``` and value ```20.9``` 

      This is a **multi-device-multi-value** mapping.

    * **if** a single devices is identified , e.g. ```"device_101023"``` \
     **then**  multiple Cumulocity MEA-requests are generated from this single payload. In this case two requests: 
      1. request: for device ```"device_101023"``` and value ```10.4```
      2. request: for device ```"device_101023"``` and value ```20.9```

      This is a **single-device-multi-value** mapping.

3. the result is an object: this is not supported.

This is illustrated on the following diagram:

<p align="center">
<img src="resources/image/Generic_Mapping_SubstitutionType.png"  style="width: 70%;" />
</p>
<br/>

___
  **NOTE:** If the size of all extracted arrays do not match, then the first values in the array with less items is taken to fill the missing values.\
  To illustrate this behavior, take the following case where:
  * the first expression returns 2 values ```[10.4, 20.9]```
  * the second expression returns 3 dates ```["2022-10-30T04:10:00.000Z", "2022-10-30T04:11:00.000Z", "2022-10-30T04:12:00.000Z"]```
  * the third expression returns 3 ids ```["device_101023","device_101024","device_101025"]```

  then three requests are generated:
  1. request: for device ```"device_101023"```, timestamp ```2022-10-30T04:10:00.000Z``` and value ```10.4```
  1. request: for device ```"device_101024"```, timestamp ```2022-10-30T04:11:00.000Z``` and value ```20.9```
  1. request: for device ```"device_101025"```, timestamp ```2022-10-30T04:12:00.000Z``` and value ```10.4```
___

#### Test transformation from source to target format

To test the defined transformation, press the button ```Transform test message```. The result of the transformation and any errors are displayed.
On test transformation can result in multiple Cumulocity requests, e.g. when a measurement is created for a device that is implicitly created, then two requests result from this transformation.
To iterate and show all results press the button ```Show Next Test Result```.



<p align="center">
<img src="resources/image/Generic_Mapping_TestTransformation.png"  style="width: 70%;" />
</p>
<br/>

When the transformation is tested and the resulting request are sent to Cumulocity, this result respective test devices are generated. These can be viewed on the tab ```Testing```. Generated devices can be deleted.
All generated test devices have a fragment ```d11r_testDevice```.


<p align="center">
<img src="resources/image/Generic_Mapping_TestDevices.png"  style="width: 70%;" />
</p>
<br/>


#### Send transformed test message to test device in Cumulocity

To send the transformed payload to a test device, press the button ```Send test message```. If an error occurs this is shown in the UI.


<p align="center">
<img src="resources/image/Generic_Mapping_SendTestMessageToCumulocity.png"  style="width: 70%;" />
</p>
<br/>

#### Use snooped payloads in source templates

In order to use a previously snooped payload click the button
```Snooped templates```. Multiples activation of this button iterates over all the recorded templates.


<p align="center">
<img src="resources/image/Generic_Mapping_MappingTemplate_Snooping_annnotated.png"  style="width: 70%;" />
</p>
<br/>

#### Update existing Mapping

To avoid inconsistencies when updating the properties of a mapping, active mapping are locked - ```READ_ONLY``` - and can't be updated. All properties of the mapping are protected from changes.
This can be seen on the following screenshot:

<p align="center">
<img src="resources/image/Generic_Mapping_TopicDefinition_ReadOnly.png"  style="width: 70%;" />
</p>
<br/>

To allow updating an activated mapping it has to be deactivated in the list of all mapping, please refer to the following screenshot:

<p align="center">
<img src="resources/image/Generic_Mapping_MappingTable_annotated.png"  style="width: 70%;" />
</p>
<br/>

#### Import & Export Mappings

On the tag with `Ìnbound Mappings` and `Outbound Mappings` you can import mappings from a JSON file. A Sample cane be found [here - Inbound](resources/script/mapping/sampleMapping/mappings-INBOUND.json) and [here - Outbound](resources/script/mapping/sampleMapping/mappings-OUTBOUND.json).
You can as well export all or a single mapping.
The import dialog can be seen on the following screenshot:

<p align="center">
<img src="resources/image/Generic_Mapping_MappingTable_Import.png"  style="width: 70%;" />
</p>
<br/>



#### Processing Extensions

When you choose the mapping type  ```PROCESSOR_EXTENSION``` the wizard for defining your mapping changes. On the second step you are not be able to change the source format of the inbound message and define substitutions. This is done by the processor extension. Instead you are able to choose a processor extension by selecting the respective message in the dropdown:

<p align="center">
<img src="resources/image/Generic_Mapping_MappingTemplate_ProtobufMessage_annnotated.png"  style="width: 70%;" />
</p>
<br/>

Using the tab ```Processor Extension``` you can upload your own processor extension. After the upload the mircroservice has to be re-subscribed in order to load the extensions. This does not happen dynamically.

<p align="center">
<img src="resources/image/Generic_Mapping_ProcessorExtensionInbound.png"  style="width: 70%;" />
</p>
<br/>

The following guide lays out the steps to create and use a processor extension:

<p align="center">
<img src="resources/image/Generic_Mapping_ProcessorExtensionInbound_Guide.png"  style="width: 70%;" />
</p>
<br/>



#### Monitoring

On the monitoring tab ```Monitoring``` you can see how a specific MQTT mapping performs since the last activation in the microservice.


<p align="center">
<img src="resources/image/Generic_Mapping_Monitoring.png"  style="width: 70%;" />
</p>
<br/>

A chart shows a summary with numbers of all successfully processed messages and those raising errors. 

<p align="center">
<img src="resources/image/Generic_Mapping_MonitoringChart.png"  style="width: 70%;" />
</p>
<br/>

#### Mapping Tree

On the tab ```Mapping Tree``` you can see how the registered mappings are organised in a tree. This can be very helpful in case of tracing any errors.



<p align="center">
<img src="resources/image/Generic_Mapping_MappingTree.png"  style="width: 70%;" />
</p>
<br/>

## API Documentation

The mapping microservice provides endpoints to control the lifecycle and manage mappings. in details these endpoint are:
1. ```.../configuration/connection```: retrieve and change the connection details to the MQTT broker
2. ```.../configuration/serice```: retrieve and change the configuration details, e.g. loglevel of the mapping service
3. ```.../operation```: execute operation: reload mappings, connect to broker, disconnect from broker, reset the monitoring statistic, reload extensions
4. ```.../monitoring/status/connector```: retrieve service status: is microservice connected to broker, are connection details loaded
5. ```.../monitoring/status/mapping```: retrieve mapping status: number of messages, errors processed per mapping
6. ```.../monitoring/tree```: all mappings are organised in a tree for efficient processing and resolving the mappings at runtime. This tree can be retrieved for debugging purposes.
7. ```.../monitoring/subscriptions```: retrieve all active subscriptions.
8. ```.../mapping```: retrieve, create, delete, update mappings
9. ```.../test/{method}?topic=URL_ENCODED_TOPIC```: this endpoint allows testing of a payload. The send parameter (boolean)  indicates if the transformed payload should be sent to Cumulocity after processing. The call return a list of ```ProcessingContext``` to record which mapping processed the payload and the outcome of the mapping process as well as error
10. ```.../extension/```: endpoint to retrieve a list of all extensions
11. ```.../extension/{extension-name}```: endpoint to retrieve/delete a specific extension

## Tests & Sample Data

### Load Test
In the resource section you find a test profil [jmeter_test_01.jmx](./resources/script/performance/jmeter_test_01.jmx) using the performance tool ```jmeter``` and an extension for MQTT: [emqx/mqtt-jmeter](https://github.com/emqx/mqtt-jmeter).
This was used to run simple loadtest.

## Setup Sample mappings

A script to create sample mappings can be found [here](./resources/script/mapping/import_mappings_01.py).
You have to start it as follows:
```
#python3 resources/script/mapping/import_mappings_01.py -p <YOUR_PASSWORD> -U <YOUR_TENANT> -u <YOUR_USER> -f resources/script/mapping/sampleMapping/sampleMappings_02.json
```

The mappings with inputs and substitutions are explained in the [sample document](./resources/script/mapping/sampleMapping/sampleMappings_02.html).

## Enhance and Extensions

### Custom message broker connector

Additional connectors supporting different message brokers can be added to the dynamic mapper.
For that an abstract Class [AConnectorClient](./dynamic-mapping-service/src/main/java/dynamic/mapping/connector/core/client/AConnectorClient.java) must be implemented handling the basic methods of a message broker like  `connect`, `subscribe` and `disconnect`.
In addition a Callback must be implemented handling the message broker typical messages and forwarding it to a [GenericMessageCallback](./dynamic-mapping-service/src/main/java/dynamic/mapping/connector/core/callback/GenericMessageCallback.java)

Check out the [MQTTCallback](./dynamic-mapping-service/src/main/java/dynamic/mapping/connector/mqtt/MQTTCallback.java) as an example implementation.

### Mapper Extensions
In the folder [dynamic.mapping.processor.extension](./dynamic-mapping-service/src/main/java/dynamic/mapping/processor/extension) you can implement  the Interface `ProcessorExtensionInbound<O>` to implement the processing of your own messages. Together with the Java representation of your message you can build your own processor extension.
This needs to be packages in a ```jar``` file. The extension packaged as a ```jar``` you can upload this extension using the tab ```Processor Extension```, see [Processing Extensions (Protobuf, ...)](#processing-extensions-protobuf) for details.
In order for the mapper backend (```dynamic-mapping-service```) to find your extension you need to add the properties file ```extension-external.properties```. The content could be as follows:
```
CustomEvent=external.extension.processor.dynamic.mapping.ProcessorExtensionInboundCustomEvent
CustomMeasurement=external.extension.processor.dynamic.mapping.ProcessorExtensionInboundCustomMeasurement
```

The steps required for a external extension are as follows. The extension:
1. has to implement the interface <code>ProcessorExtensionInbound<O></code> 
2. be registered in the properties file <code>dynamic-mapping-extension/src/main/resources/extension-external.properties</code>
3. be developed/packed in the maven module <code>dynamic-mapping-extension</code>. **Not** in the maven module <code>dynamic-mapping-service</code>. This is reserved for internal extensions.
4. be uploaded through the Web UI.

> **_NOTE:_** When you implement <code>ProcessorExtensionInbound<O></code> an additional <code>RepairStrategy.CREATE_IF_MISSING</code> can be used. This helps to address mapping cases, where you want to create a mapping that adapts to different structures of source payloads. It is used to create a node in the target if it doesn't exist and allows for using mapping with dynamic content. See [sample 25](./resources/script/mapping/sampleMapping/SampleMappings_06.pdf).

A sample how to build an extension is contained in the maven module [dynamic-mapping-extension](./dynamic-mapping-extension).
The following diagram shows how the dispatcher handles messages with different format:

TODO Replace picture
<p align="center">
<img src="resources/image/Generic_Mapping_Dispatcher.png"  style="width: 70%;" />
</p>
<br/>

______________________
These tools are provided as-is and without warranty or support. They do not constitute part of the Software AG product suite. Users are free to use, fork and modify them, subject to the license agreement. While Software AG welcomes contributions, we cannot guarantee to include every contribution in the master project.

Contact us at [TECHcommunity](mailto:technologycommunity@softwareag.com?subject=Github/SoftwareAG) if you have any questions.

