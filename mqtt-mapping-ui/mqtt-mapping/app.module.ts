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
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule as ngRouterModule } from '@angular/router';
import { BootstrapComponent, CoreModule, HOOK_WIZARD, RouterModule } from '@c8y/ngx-components';
import { MQTTMappingModule } from './src/service-mapping.module';
import { AddExtensionWizardComponent } from './src/mqtt-extension/add-extension-wizard.component';
import { MappingTypeComponent } from './src/mqtt-mapping/mapping-type/mapping-type.component';


@NgModule({
  declarations: [],
  imports: [
    BrowserAnimationsModule,
    ngRouterModule.forRoot([], { enableTracing: false, useHash: true }),
    RouterModule.forRoot(),
    CoreModule.forRoot(),
    MQTTMappingModule,
  ],
  providers: [
    {
      provide: HOOK_WIZARD,
      useValue: {
        wizardId: 'uploadExtensionWizard',
        component: AddExtensionWizardComponent,
        name: 'Upload Extension',
        c8yIcon: 'upload'
      },
      multi: true
    },
    {
      provide: HOOK_WIZARD,
      useValue: {
        // The id of a wizard to which the entry should be hooked.
        wizardId: 'addMappingWizard',
        // The container component is responsible for handling subsequent steps in the wizard.
        component: MappingTypeComponent,
        // Menu entry name
        name: 'App mapping',
        // Menu entry icon
        c8yIcon: 'plus-circle'
      },
      multi: true
    },
  ],
  bootstrap: [BootstrapComponent]
})
export class AppModule {}
