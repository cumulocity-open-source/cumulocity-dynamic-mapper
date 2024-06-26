/*
 * Copyright (c) 2022 Software AG, Darmstadt, Germany and/or Software AG USA Inc., Reston, VA, USA,
 * and/or its subsidiaries and/or its affiliates and/or their licensors.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @authors Christof Strack
 */
import { Injectable } from '@angular/core';
import { ApplicationService } from '@c8y/client';
import {
  AlertService,
  AppStateService,
  gettext,
  NavigatorNode,
  NavigatorNodeFactory
} from '@c8y/ngx-components';
import { SharedService } from './shared.service';

@Injectable()
export class MappingNavigationFactory implements NavigatorNodeFactory {
  private static readonly APPLICATION_DYNAMIC_MAPPING_SERVICE =
    'dynamic-mapping-service';
  private NAVIGATION_NODE_MQTT;

  appName: string;

  constructor(
    private applicationService: ApplicationService,
    private alertService: AlertService,
    private sharedService: SharedService,
    private appStateService: AppStateService
  ) {
    appStateService.currentApplication.subscribe((c) => {
      console.log(c);
      this.appName = c.name;
    });
  }

  get() {
    this.NAVIGATION_NODE_MQTT = new NavigatorNode({
      parent:  this.appName.startsWith('dynamic-mapping') ? undefined : gettext('Settings'),
      label: gettext('Dynamic Mapping'),
      icon: 'ftp-server',
      path: '/sag-ps-pkg-dynamic-mapping/mappings/inbound',
      priority: 99,
      preventDuplicates: true
    });
    const feature: any = this.sharedService.getFeatures();
    return this.applicationService
      .isAvailable(MappingNavigationFactory.APPLICATION_DYNAMIC_MAPPING_SERVICE)
      .then((data) => {
        if (!data.data || !feature) {
          this.alertService.danger(
            'Microservice:dynamic-mapping-service not subscribed. Please subscribe this service before using the mapping editor!'
          );
          console.error('dynamic-mapping-service microservice not subscribed!');
          return [];
        }
        return this.NAVIGATION_NODE_MQTT;
      });
  }
}
