import { Injectable } from '@angular/core';
import { ApplicationService } from '@c8y/client';
import { gettext, NavigatorNode, NavigatorNodeFactory } from '@c8y/ngx-components';

@Injectable()
export class MQTTConfigurationNavigationFactory implements NavigatorNodeFactory {
  private static readonly APPLICATION_MQTT_GENERIC = 'generic-mqtt-agent';

  private readonly NAVIGATION_NODE_MQTT = new NavigatorNode({
    parent: gettext('Settings'),
    label: gettext('MQTT'),
    icon: 'ftp-server',
    path: '/mqtt/configuration',
    priority: 99,
    preventDuplicates: true,
  });

  constructor(private applicationService: ApplicationService) {}

  get() {
    return this.applicationService
      .isAvailable(MQTTConfigurationNavigationFactory.APPLICATION_MQTT_GENERIC)
      .then((result) => {
        if (!(result && result.data)) {
          console.error('MQTT Generic Microservice not subscribed!');
          return [];
        }
        //console.log('navigation node: ', this.NAVIGATION_NODE_MQTT);
        return this.NAVIGATION_NODE_MQTT;
      });
  }
}