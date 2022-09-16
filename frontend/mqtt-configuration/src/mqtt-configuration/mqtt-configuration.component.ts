import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MQTTConfigurationService } from './mqtt-configuration.service';
import { AlertService, gettext } from '@c8y/ngx-components';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { TerminateBrokerConnectionModalComponent } from './terminate-connection-modal/terminate-connection-modal.component';
import { MQTTMappingService } from '../mqtt-mapping/mqtt-mapping.service';
import { StatusMessage } from '../shared/mqtt-configuration.model';
import { catchError, map, tap } from 'rxjs/operators';
import { from, Observable } from 'rxjs';


@Component({
  selector: 'mqtt-configuration',
  templateUrl: 'mqtt-configuration.component.html',
})
export class MQTTConfigurationComponent implements OnInit {

  isMQTTInitialized: boolean;
  isMQTTActivated: boolean;
  isMQTTConnected: boolean;
  isMQTTAgentCreated$: Observable<boolean>;
  mqttAgentId$: Observable<string>;

  mqttForm: FormGroup;

  liveData$: Observable<any>;

  constructor(
    private bsModalService: BsModalService,
    public mqttConfigurationService: MQTTConfigurationService,
    public mqttMappingService: MQTTMappingService,
    public alertservice: AlertService
  ) {
  }

  ngOnInit() {
    this.initForm();
    this.initConnectionStatus();
    this.initConnectionDetails();
    this.mqttAgentId$ = from(this.mqttMappingService.initializeMQTTAgent());
    this.isMQTTAgentCreated$ = this.mqttAgentId$.pipe(map( agentId => agentId != null));
    //console.log("Init configuration, mqttAgent", this.isMQTTAgentCreated);
  }

  async initConnectionStatus(): Promise<void> {
    this.isMQTTInitialized = false;
    this.isMQTTActivated = false;
    this.isMQTTConnected = false;
    let status = await this.mqttConfigurationService.getConnectionStatus();
    if (status === "ACTIVATED") {
      this.isMQTTConnected = false;
      this.isMQTTInitialized = true;
      this.isMQTTActivated = true;
    } else if (status === "CONNECTED") {
      this.isMQTTConnected = true;
      this.isMQTTInitialized = true;
      this.isMQTTActivated = true;
    } else if (status === "ONLY_CONFIGURED") {
      this.isMQTTConnected = false;
      this.isMQTTInitialized = true;
      this.isMQTTActivated = false;
    }
    console.log("Retrieved status:", status, this.isMQTTConnected)
  }

  private initForm(): void {
    this.mqttForm = new FormGroup({
      mqttHost: new FormControl('', Validators.required),
      mqttPort: new FormControl('', Validators.required),
      user: new FormControl('', Validators.required),
      password: new FormControl('', Validators.required),
      clientId: new FormControl('', Validators.required),
      useTLS: new FormControl('', Validators.required),
    });
  }

  private async initConnectionDetails(): Promise<void> {
    const connectionDetails = await this.mqttConfigurationService.getConnectionDetails();
    console.log("Connection details", connectionDetails)
    if (!connectionDetails) {
      return;
    }

    this.mqttForm.patchValue({
      mqttHost: connectionDetails.mqttHost,
      mqttPort: connectionDetails.mqttPort,
      user: connectionDetails.user,
      password: connectionDetails.password,
      clientId: connectionDetails.clientId,
      useTLS: connectionDetails.useTLS,
    });
  }

  async onConnectButtonClicked() {
    this.connectToMQTTBroker();
  }

  async onDisconnectButtonClicked() {
    this.showTerminateConnectionModal();
  }


  async onUpdateButtonClicked() {
    this.updateConnectionDetails();
  }

  private async updateConnectionDetails() {
    const response = await this.mqttConfigurationService.updateConnectionDetails({
      mqttHost: this.mqttForm.value.mqttHost,
      mqttPort: this.mqttForm.value.mqttPort,
      user: this.mqttForm.value.user,
      password: this.mqttForm.value.password,
      clientId: this.mqttForm.value.clientId,
      useTLS: this.mqttForm.value.useTLS,
      active: false
    });

    if (response.status < 300) {
      this.alertservice.success(gettext('Update successful'));
      this.isMQTTInitialized = true;
      this.isMQTTActivated = false;
    } else {
      this.alertservice.danger(gettext('Failed to update connection'));
      this.isMQTTActivated = false;
    }
  }

  private async connectToMQTTBroker() {
    const response1 = await this.mqttConfigurationService.connectToMQTTBroker();
    const response2 = await this.mqttMappingService.activateMappings();
    console.log("Details connectToMQTTBroker", response1, response2)
    if (response1.status === 201 && response2.status === 201) {
      this.alertservice.success(gettext('Connection successful'));
      this.isMQTTActivated = true;
    } else {
      this.alertservice.danger(gettext('Failed to establish connection'));
      this.isMQTTActivated = false;
    }
  }

  private showTerminateConnectionModal() {
    const terminateExistingConnectionModalRef: BsModalRef = this.bsModalService.show(
      TerminateBrokerConnectionModalComponent,
      {}
    );
    terminateExistingConnectionModalRef.content.closeSubject.subscribe(
      async (isTerminateConnection: boolean) => {
        if (!isTerminateConnection) {
          return;
        }
        await this.disconnectFromMQTT();
      }
    );
  }

  private async disconnectFromMQTT() {
    const response = await this.mqttConfigurationService.disconnectFromMQTTBroker();
    console.log("Details disconnectFromMQTT", response)
    if (response.status < 300) {
      this.isMQTTActivated = false;
      this.alertservice.success(gettext('Successfully disconnected'));
    } else {
      this.alertservice.danger(gettext('Failed to disconnect'));
    }
  }
}