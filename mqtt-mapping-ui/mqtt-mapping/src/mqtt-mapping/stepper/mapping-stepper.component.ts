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
import { CdkStep } from '@angular/cdk/stepper';
import { AfterContentChecked, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AlertService, C8yStepper } from '@c8y/ngx-components';
import * as _ from 'lodash';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { BehaviorSubject } from 'rxjs';
import { debounceTime } from "rxjs/operators";
import { API, Direction, Extension, Mapping, MappingSubstitution, QOS, RepairStrategy, SnoopStatus, ValidationError } from "../../shared/mapping.model";
import { checkPropertiesAreValid, checkSubstitutionIsValid, COLOR_HIGHLIGHTED, definesDeviceIdentifier, deriveTemplateTopicFromTopic, getSchema, isWildcardTopic, SAMPLE_TEMPLATES_C8Y, splitTopicExcludingSeparator, TOKEN_DEVICE_TOPIC, TOKEN_TOPIC_LEVEL, whatIsIt, countDeviceIdentifiers, getExternalTemplate, SAMPLE_TEMPLATES_EXTERNAL } from "../../shared/util";
import { OverwriteSubstitutionModalComponent } from '../overwrite/overwrite-substitution-modal.component';
import { SnoopingModalComponent } from '../snooping/snooping-modal.component';
import { JsonEditorComponent, JsonEditorOptions } from '../../shared/editor/jsoneditor.component';
import { SubstitutionRendererComponent } from './substitution/substitution-renderer.component';
import { C8YRequest } from '../processor/prosessor.model';
import { MappingService } from '../core/mapping.service';
import { EditorMode, StepperConfiguration } from './stepper-model';
import { BrokerConfigurationService } from '../../mqtt-configuration/broker-configuration.service';
import { isDisabled } from './util';
import { FormlyFieldConfig, FormlyForm, FormlyFormOptions } from '@ngx-formly/core';

@Component({
  selector: 'mapping-stepper',
  templateUrl: 'mapping-stepper.component.html',
  styleUrls: ['../shared/mapping.style.css'],
  encapsulation: ViewEncapsulation.None,
})

export class MappingStepperComponent implements OnInit, AfterContentChecked {

  @Input() mapping: Mapping;
  @Input() mappings: Mapping[];
  @Input() stepperConfiguration: StepperConfiguration;
  @Output() onCancel = new EventEmitter<any>();
  @Output() onCommit = new EventEmitter<Mapping>();

  API = API;
  ValidationError = ValidationError;
  RepairStrategy = RepairStrategy;
  QOS = QOS;
  SnoopStatus = SnoopStatus;
  Direction = Direction;
  keys = Object.keys;
  values = Object.values;
  isWildcardTopic = isWildcardTopic;
  definesDeviceIdentifier = definesDeviceIdentifier;
  isDisabled = isDisabled;
  COLOR_HIGHLIGHTED = COLOR_HIGHLIGHTED;
  EditorMode = EditorMode;

  propertyForm: FormGroup;
  propertyFormly: FormGroup = new FormGroup({});
  templateForm: FormGroup;
  testForm: FormGroup;
  templateSource: any;
  templateTarget: any;
  templateTestingResults: C8YRequest[] = [];
  templateTestingErrorMsg: string;
  templateTestingRequest: any;
  templateTestingResponse: any;
  selectedTestingResult: number = -1;
  countDeviceIdentifers$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  sourceSystem: string;
  targetSystem: string;

  editorOptionsSource: JsonEditorOptions = new JsonEditorOptions();
  editorOptionsTarget: JsonEditorOptions = new JsonEditorOptions();
  editorOptionsTesting: JsonEditorOptions = new JsonEditorOptions();
  sourceExpression = {
    Rresult: '',
    resultType: 'empty',
    errrorMsg: ''
  } as any
  targetExpression = {
    Rresult: '',
    resultType: 'empty',
    errrorMsg: ''
  } as any

  showConfigMapping: boolean = false;
  selectedSubstitution: number = -1;
  snoopedTemplateCounter: number = 0;
  currentSubstitution: MappingSubstitution = {
    pathSource: '',
    pathTarget: '',
    repairStrategy: RepairStrategy.DEFAULT,
    expandArray: false
  };
  step: any;

  fieldsProperty: FormlyFieldConfig[];
  options: FormlyFormOptions = {};


  @ViewChild('editorSource', { static: false }) editorSource: JsonEditorComponent;
  @ViewChild('editorTarget', { static: false }) editorTarget: JsonEditorComponent;
  @ViewChild('editorTestingRequest', { static: false }) editorTestingRequest: JsonEditorComponent;
  @ViewChild('editorTestingResponse', { static: false }) editorTestingResponse: JsonEditorComponent;

  @ViewChild(SubstitutionRendererComponent, { static: false }) substitutionChild: SubstitutionRendererComponent;

  @ViewChild(C8yStepper, { static: false })
  stepper: C8yStepper;
  extensions: Map<string, Extension> = new Map();
  extensionEvents$: BehaviorSubject<string[]> = new BehaviorSubject([]);
  constructor(
    public bsModalService: BsModalService,
    public mappingService: MappingService,
    public configurationService: BrokerConfigurationService,
    private alertService: AlertService,
    private elementRef: ElementRef,

  ) { }

  ngOnInit() {
    // set value for backward compatiblility
    if (!this.mapping.direction) this.mapping.direction = Direction.INBOUND;
    this.targetSystem = this.mapping.direction == Direction.INBOUND ? 'Cumulocity' : 'MQTT Broker';
    this.sourceSystem = this.mapping.direction == Direction.OUTBOUND ? 'Cumulocity' : 'MQTT Broker';
    console.log("Mapping to be updated:", this.mapping, this.stepperConfiguration);
    let numberSnooped = (this.mapping.snoopedTemplates ? this.mapping.snoopedTemplates.length : 0);
    if (this.mapping.snoopStatus == SnoopStatus.STARTED && numberSnooped > 0) {
      this.alertService.success("Already " + numberSnooped + " templates exist. In the next step you an stop the snooping process and use the templates. Click on Next");
    }

    this.fieldsProperty = [
      {
        key: 'name',
        type: 'input',
        templateOptions: {
          label: 'Mapping Name',
          disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY,
        },
      },
      {
        key: 'subscriptionTopic',
        type: 'input',
        templateOptions: {
          label: 'Subscription Topic',
          placeholder: 'Subscription Topic ...',
          disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY,
          change: (field: FormlyFieldConfig, event?: any) => {
            this.mapping.templateTopic = deriveTemplateTopicFromTopic(this.propertyFormly.get('subscriptionTopic').value);
            this.mapping.templateTopicSample = this.mapping.templateTopic;
            this.mapping = {
              ...this.mapping
            }
          }
        },
        hideExpression: (this.stepperConfiguration.direction == Direction.OUTBOUND),
      },
      {
        key: 'publishTopic',
        type: 'input',
        templateOptions: {
          label: 'Publish Topic',
          placeholder: 'Publish Topic ...',
          disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY,
          change: (field: FormlyFieldConfig, event?: any) => {
            const derived = deriveTemplateTopicFromTopic(this.propertyFormly.get('publishTopic').value);
            this.mapping.templateTopicSample = derived;
            this.mapping = {
              ...this.mapping
            }
          }
        },
        hideExpression: (this.stepperConfiguration.direction != Direction.OUTBOUND),
      },
      {
        key: 'templateTopic',
        type: 'input',
        templateOptions: {
          label: 'Template Topic',
          placeholder: 'Template Topic ...',
          disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY,
          description: 'The TemplateTopic name must begin with the Topic name.'
        },
        hideExpression: (this.stepperConfiguration.direction == Direction.OUTBOUND),
      },
      {
        key: 'templateTopicSample',
        type: 'input',
        templateOptions: {
          label: 'Template Topic Sample',
          placeholder: 'e.g. device/110',
          disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY,
          description: 'The TemplateTopicSample name must have the same number of levels and must match the ' + (this.stepperConfiguration.direction == Direction.OUTBOUND) ? 'Publish Topic.' : 'TemplateTopic.'
        },
      },
      {
        key: 'filterOutbound',
        type: 'input',
        templateOptions: {
          label: 'Filter Outbound',
          placeholder: 'e.g. custom_OperationFragment',
          disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY,
          description: 'The Filter Outbound can contain one fragment name to associate a mapping to a Cumulocity MEAO. If the Cumulocity MEAO contains this fragment, the maping is applied.'
        },
        hideExpression: (this.stepperConfiguration.direction != Direction.OUTBOUND),
      },

      {
        fieldGroupClassName: 'row',
        fieldGroup: [
          {
            className: 'col-md-6',
            key: 'targetAPI',
            type: 'select',
            templateOptions: {
              label: 'Target API',
              options: Object.keys(API).map(key => { return { label: key, value: key } }),
              disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY,
              change: (field: FormlyFieldConfig, event?: any) => {
                console.log("Changes:", field, event, this.mapping)
                this.onTargetAPIChanged(this.propertyFormly.get('targetAPI').value)
              }
            },
          },
          {
            className: 'col-md-6',
            key: 'createNonExistingDevice',
            type: 'boolean',
            templateOptions: {
              label: 'Create Non Existing Device',
              disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY,
              description: 'In case a MEAO is received and the referenced device does not yet exist, it can be created automatically.'
            },
            hideExpression: () => (this.stepperConfiguration.direction == Direction.OUTBOUND || this.mapping.targetAPI == API.INVENTORY.name),
          },
          {
            className: 'col-md-6',
            key: 'updateExistingDevice',
            type: 'boolean',
            templateOptions: {
              label: 'Update Existing Device',
              disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY,
              description: 'Update Existing Device.'
            },
            hideExpression: () => (this.stepperConfiguration.direction == Direction.OUTBOUND || (this.stepperConfiguration.direction == Direction.INBOUND && this.mapping.targetAPI != API.INVENTORY.name)),
          },
          {
            className: 'col-md-6',
            key: 'autoAckOperation',
            type: 'boolean',
            templateOptions: {
              label: 'Auto acknowledge',
              disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY,
              description: 'Auto acknowledge outbound operation.'
            },
            hideExpression: () => (this.stepperConfiguration.direction == Direction.INBOUND || (this.stepperConfiguration.direction == Direction.OUTBOUND && this.mapping.targetAPI != API.OPERATION.name)),
          }],
      },
      {
        fieldGroupClassName: 'row',
        fieldGroup: [
          {
            className: 'col-md-6',
            key: 'qos',
            type: 'select',
            templateOptions: {
              label: 'QOS',
              options: Object.values(QOS).map(key => { return { label: key, value: key } }),
              disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY,
            },
          },
          {
            className: 'col-md-6',
            key: 'snoopStatus',
            type: 'select',
            templateOptions: {
              label: 'Snoop payload',
              options: Object.keys(SnoopStatus).map(key => { return { label: key, value: key, disabled: (key != 'ENABLED' && key != 'NONE') } }),
              disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY,
              description: 'Snooping records the payloads and saves them for later usage. Once the snooping starts and payloads are recorded, they can be used as templates for defining the source format of the MQTT mapping.'
            },
          },],
      },
    ];

    this.setPropertyForm();
    this.setTemplateForm();
    this.editorOptionsSource = {
      ...this.editorOptionsSource,
      modes: ['tree', 'code'],
      statusBar: false,
      navigationBar: false,
      enableSort: false,
      enableTransform: false
    };

    this.editorOptionsTarget = {
      ...this.editorOptionsTarget,
      modes: ['tree', 'code'],
      statusBar: false,
      navigationBar: false,
      enableSort: false,
      enableTransform: false,
    };

    this.editorOptionsTesting = {
      ...this.editorOptionsTesting,
      modes: ['form'],
      statusBar: false,
      navigationBar: false,
      enableSort: false,
      enableTransform: false
    };
    this.onExpressionsUpdated();
    this.onPropertyFormUpdated();
    this.countDeviceIdentifers$.next(countDeviceIdentifiers(this.mapping));

    this.extensionEvents$.subscribe(events => {
      console.log("New events from extension", events);
    })
  }

  ngAfterContentChecked(): void {
    // if json source editor is displayed then choose the first selection
    const editorSourceRef = this.elementRef.nativeElement.querySelector('#editorSource');
    if (editorSourceRef != null && !editorSourceRef.getAttribute("listener")) {
      //console.log("I'm here, ngAfterContentChecked", editorSourceRef, editorSourceRef.getAttribute("listener"));
      this.selectedSubstitution = 0;
      this.onSelectSubstitution(this.selectedSubstitution);
      editorSourceRef.setAttribute("listener", "true");
    }
  }

  private setPropertyForm(): void {
    this.propertyForm = new FormGroup({
      name: new FormControl({ value: this.mapping.name, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }, Validators.required),
      id: new FormControl({ value: this.mapping.id, disabled: false }, Validators.required),
      targetAPI: new FormControl({ value: this.mapping.targetAPI, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }, Validators.required),
      subscriptionTopic: new FormControl({ value: this.mapping.subscriptionTopic, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }, Validators.nullValidator),
      publishTopic: new FormControl({ value: this.mapping.publishTopic, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }, (this.stepperConfiguration.direction != Direction.OUTBOUND ? Validators.nullValidator : Validators.required)),
      templateTopic: new FormControl({ value: this.mapping.templateTopic, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }, (this.stepperConfiguration.direction == Direction.OUTBOUND ? Validators.nullValidator : Validators.required)),
      templateTopicSample: new FormControl({ value: this.mapping.templateTopicSample, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }, Validators.required),
      active: new FormControl({ value: this.mapping.active, disabled: false }),
      qos: new FormControl({ value: this.mapping.qos, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }, Validators.required),
      mapDeviceIdentifier: new FormControl({ value: this.mapping.mapDeviceIdentifier, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }),
      createNonExistingDevice: new FormControl({ value: this.mapping.createNonExistingDevice, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY || this.stepperConfiguration.direction == Direction.OUTBOUND }),
      updateExistingDevice: new FormControl({ value: this.mapping.updateExistingDevice, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }),
      externalIdType: new FormControl({ value: this.mapping.externalIdType, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }),
      snoopStatus: new FormControl({ value: this.mapping.snoopStatus, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }),
      filterOutbound: new FormControl({ value: this.mapping.filterOutbound, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }, (this.stepperConfiguration.direction == Direction.OUTBOUND ? Validators.required : Validators.nullValidator)),
      autoAckOperation: new FormControl({ value: this.mapping.autoAckOperation, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }),
    },
      checkPropertiesAreValid(this.mappings, this.stepperConfiguration.direction)
    );
  }

  private getPropertyForm(): void {
    this.mapping.name = this.propertyForm.controls['name'].value;
    this.mapping.id = this.propertyForm.controls['id'].value;
    this.mapping.targetAPI = this.propertyForm.controls['targetAPI'].value;
    this.mapping.subscriptionTopic = this.propertyForm.controls['subscriptionTopic'].value;
    this.mapping.publishTopic = this.propertyForm.controls['publishTopic'].value;
    this.mapping.templateTopic = this.propertyForm.controls['templateTopic'].value;
    this.mapping.templateTopicSample = this.propertyForm.controls['templateTopicSample'].value;
    this.mapping.active = this.propertyForm.controls['active'].value;
    this.mapping.qos = this.propertyForm.controls['qos'].value;
    this.mapping.mapDeviceIdentifier = this.propertyForm.controls['mapDeviceIdentifier'].value;
    this.mapping.createNonExistingDevice = this.propertyForm.controls['createNonExistingDevice'].value;
    this.mapping.updateExistingDevice = this.propertyForm.controls['updateExistingDevice'].value;
    this.mapping.externalIdType = this.propertyForm.controls['externalIdType'].value;
    this.mapping.snoopStatus = this.propertyForm.controls['snoopStatus'].value;
    this.mapping.filterOutbound = this.propertyForm.controls['filterOutbound'].value;
    this.mapping.autoAckOperation = this.propertyForm.controls['autoAckOperation'].value;
  }

  private setTemplateForm(): void {
    this.templateForm = new FormGroup({
      ps: new FormControl({ value: this.currentSubstitution.pathSource, disabled: false }),
      pt: new FormControl({ value: this.currentSubstitution.pathTarget, disabled: false }),
      rs: new FormControl({ value: this.currentSubstitution.repairStrategy, disabled: this.stepperConfiguration.direction == Direction.OUTBOUND }),
      ea: new FormControl({ value: this.currentSubstitution.expandArray, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY || this.stepperConfiguration.direction == Direction.OUTBOUND }),
      exName: new FormControl({ value: this.mapping?.extension?.name, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }),
      exEvent: new FormControl({ value: this.mapping?.extension?.event, disabled: this.stepperConfiguration.editorMode == EditorMode.READ_ONLY }),
      sourceExpressionResult: new FormControl({ value: this.sourceExpression.result, disabled: true }),
      targetExpressionResult: new FormControl({ value: this.targetExpression.result, disabled: true }),
    },
      checkSubstitutionIsValid(this.mapping, this.stepperConfiguration)
    );
  }

  private getTemplateForm(): void {
    this.currentSubstitution.pathSource = this.templateForm.controls['ps'].value;
    this.currentSubstitution.pathTarget = this.templateForm.controls['pt'].value;
    this.currentSubstitution.repairStrategy = this.templateForm.controls['rs'].value;
    this.currentSubstitution.expandArray = this.templateForm.controls['ea'].value;
    if (this.mapping.extension) {
      this.mapping.extension.name = this.templateForm.controls['exName'].value;
      this.mapping.extension.event = this.templateForm.controls['exEvent'].value;
    }
    this.sourceExpression.result = this.templateForm.controls['sourceExpressionResult'].value;
    this.targetExpression.result = this.templateForm.controls['targetExpressionResult'].value;
  }

  public onSelectedSourcePathChanged(path: string) {
    this.updateSourceExpressionResult(path);
    this.currentSubstitution.pathSource = path;
    this.templateForm.patchValue({ ps: path });
  }

  public updateSourceExpressionResult(path: string) {
    try {
      let r: JSON = this.mappingService.evaluateExpression(this.editorSource?.get(), path);
      this.sourceExpression = {
        resultType: whatIsIt(r),
        result: JSON.stringify(r, null, 4),
        errorMsg: ''
      }
      this.templateForm.patchValue({ sourceExpressionResult: this.sourceExpression.result });

    } catch (error) {
      console.log("Error evaluating source expression: ", error);
      this.sourceExpression.errorMsg = error.message
    }
  }

  public onSelectedTargetPathChanged(path: string) {
    this.updateTargetExpressionResult(path);
    this.currentSubstitution.pathTarget = path;
    this.templateForm.patchValue({ pt: path });

  }

  public updateTargetExpressionResult(path: string) {
    try {
      let r: JSON = this.mappingService.evaluateExpression(this.editorTarget?.get(), path);
      this.targetExpression = {
        resultType: whatIsIt(r),
        result: JSON.stringify(r, null, 4),
        errorMsg: ''
      }

      this.templateForm.patchValue({ targetExpressionResult: this.targetExpression.result });

    } catch (error) {
      console.log("Error evaluating target expression: ", error);
      this.targetExpression.errorMsg = error.message
    }
  }

  onTopicUpdated(): void {
    if (this.stepperConfiguration.direction == Direction.INBOUND) {
      this.propertyForm.get('subscriptionTopic').valueChanges.pipe(debounceTime(500))
        // distinctUntilChanged()
        .subscribe(val => {
          let touched = this.propertyForm.get('subscriptionTopic').dirty;
          console.log(`subscriptionTopic changed is ${val}.`, touched);
          if (touched) {
            this.mapping.templateTopic = val as string;
          }
        });
    } else {
      this.propertyForm.get('publishTopic').valueChanges.pipe(debounceTime(500))
        // distinctUntilChanged()
        .subscribe(val => {
          let touched = this.propertyForm.get('publishTopic').dirty;
          console.log(`publishTopic changed is ${val}.`, touched);
          if (touched) {
            this.mapping.templateTopic = val as string;
          }
        });
    }
  }

  onSubscriptionTopicChanged(subscriptionTopic): void {
    this.mapping.templateTopic = deriveTemplateTopicFromTopic(subscriptionTopic);
    this.mapping.templateTopicSample = this.mapping.templateTopic;
    this.propertyForm.patchValue({ templateTopic: this.mapping.templateTopic, templateTopicSample: this.mapping.templateTopic });
  }

  onPublishTopicChanged(publishTopic): void {
    this.mapping.templateTopic = deriveTemplateTopicFromTopic(publishTopic);
    this.mapping.templateTopicSample = this.mapping.templateTopic;
    this.propertyForm.patchValue({ templateTopic: this.mapping.templateTopic, templateTopicSample: this.mapping.templateTopic });

  }

  onTemplateTopicChanged(templateTopic): void {
    this.mapping.templateTopicSample = templateTopic;
    this.propertyForm.patchValue({ templateTopicSample: this.mapping.templateTopic });
  }

  private onExpressionsUpdated(): void {
    this.templateForm.get('ps').valueChanges.pipe(debounceTime(500))
      // distinctUntilChanged()
      .subscribe(val => {
        //console.log(`Updated sourcePath ${val}.`, val);
        this.updateSourceExpressionResult(val);
      });

    this.templateForm.get('pt').valueChanges.pipe(debounceTime(500))
      // distinctUntilChanged()
      .subscribe(val => {
        //console.log(`Updated targetPath ${val}.`, val);
        this.updateTargetExpressionResult(val);
      });
  }
  private onPropertyFormUpdated(): void {
    // this.propertyForm.valueChanges.pipe(debounceTime(500))
    //   // distinctUntilChanged()
    //   .subscribe(val => {
    //     console.log(`Updated propertyForm ${val}.`, val);
    //   });
    // this.propertyForm.get('updateExistingDevice').valueChanges.pipe(debounceTime(500))
    //   // distinctUntilChanged()
    //   .subscribe(val => {
    //     console.log(`Updated updateExistingDevice ${val}.`, !val);
    //     this.stepperConfiguration.allowNoDefinedIdentifier = !val;
    //   });
  }

  private getCurrentMapping(patched: boolean): Mapping {
    return {
      ... this.mapping,
      source: this.reduceSourceTemplate(this.editorSource ? this.editorSource.get() : {}, patched),   //remove dummy field "_DEVICE_IDENT_", array "_TOPIC_LEVEL_" since it should not be stored
      target: this.reduceTargetTemplate(this.editorTarget.get(), patched),   //remove dummy field "_DEVICE_IDENT_", since it should not be stored
      lastUpdate: Date.now(),
    };
  }

  async onCommitButton() {
    this.onCommit.emit(this.getCurrentMapping(false));
  }

  async onTestTransformation() {
    let testProcessingContext = await this.mappingService.testResult(this.getCurrentMapping(true), false);
    this.templateTestingResults = testProcessingContext.requests;
    if (testProcessingContext.errors.length > 0) {
      this.alertService.warning("Test tranformation was not successfull!");
      testProcessingContext.errors.forEach(msg => {
        this.alertService.danger(msg);
      })
    }
    this.onNextTestResult();
  }

  async onSendTest() {
    let testProcessingContext = await this.mappingService.testResult(this.getCurrentMapping(true), true);
    this.templateTestingResults = testProcessingContext.requests;
    if (testProcessingContext.errors.length > 0) {
      this.alertService.warning("Test tranformation was not successfull!");
      testProcessingContext.errors.forEach(msg => {
        this.alertService.danger(msg);
      })
    }
    this.onNextTestResult();
  }

  public onNextTestResult() {
    if (this.selectedTestingResult >= this.templateTestingResults.length - 1) {
      this.selectedTestingResult = -1;
    }
    this.selectedTestingResult++;
    if (this.selectedTestingResult >= 0 && this.selectedTestingResult < this.templateTestingResults.length) {
      this.templateTestingRequest = this.templateTestingResults[this.selectedTestingResult].request;
      this.templateTestingResponse = this.templateTestingResults[this.selectedTestingResult].response;
      this.editorTestingRequest.setSchema(getSchema(this.templateTestingResults[this.selectedTestingResult].targetAPI, this.mapping.direction, true), null);
      this.templateTestingErrorMsg = this.templateTestingResults[this.selectedTestingResult].error
    } else {
      this.templateTestingRequest = JSON.parse("{}");
      this.templateTestingResponse = JSON.parse("{}");
      this.templateTestingErrorMsg = undefined;
    }
  }

  async onSampleTargetTemplatesButton() {
    if (this.stepperConfiguration.direction == Direction.INBOUND) {
      this.templateTarget = this.expandC8YTemplate(JSON.parse(SAMPLE_TEMPLATES_C8Y[this.mapping.targetAPI]));
    } else {
      let levels: String[] = splitTopicExcludingSeparator(this.mapping.templateTopicSample);
      this.templateTarget = this.expandExternalTemplate(JSON.parse(getExternalTemplate(this.mapping)), levels);
    }
    this.editorTarget.set(this.templateTarget);
  }

  async onCancelButton() {
    this.onCancel.emit();
  }

  onSelectExtension(extension) {
    console.log("onSelectExtension", extension);
    this.mapping.extension.name = extension;
    this.extensionEvents$.next(Object.keys(this.extensions[extension].extensionEntries));
  }

  public async onNextStep(event: { stepper: C8yStepper; step: CdkStep }): Promise<void> {

    console.log("OnNextStep", event.step.label, this.mapping)
    this.step = event.step.label;

    if (this.step == "Define topic") {
      this.getPropertyForm();
      console.log("Populate jsonPath if wildcard:", isWildcardTopic(this.mapping.subscriptionTopic), this.mapping.substitutions.length)
      console.log("Templates from mapping:", this.mapping.target, this.mapping.source)
      this.enrichTemplates();
      // set schema for editors
      this.editorTarget.setSchema(getSchema(this.mapping.targetAPI, this.mapping.direction, true), null);
      if (this.stepperConfiguration.showEditorSource) {
        this.editorSource.setSchema(getSchema(this.mapping.targetAPI, this.mapping.direction, false), null);
      }
      this.editorTestingRequest.setSchema(getSchema(this.mapping.targetAPI, this.mapping.direction, true), null);
      this.editorTestingResponse.setSchema(getSchema(this.mapping.targetAPI, this.mapping.direction, true), null);
      this.extensions = await this.configurationService.getProcessorExtensions() as any;
      if (this.mapping?.extension?.name) {
        this.extensionEvents$.next(Object.keys(this.extensions[this.mapping?.extension?.name].extensionEntries));
      }

      let numberSnooped = (this.mapping.snoopedTemplates ? this.mapping.snoopedTemplates.length : 0);
      const initialState = {
        snoopStatus: this.mapping.snoopStatus,
        numberSnooped: numberSnooped,
      }
      if (this.mapping.snoopStatus == SnoopStatus.ENABLED && this.mapping.snoopedTemplates.length == 0) {
        console.log("Ready to snoop ...");
        const modalRef: BsModalRef = this.bsModalService.show(SnoopingModalComponent, { initialState });
        modalRef.content.closeSubject.subscribe((confirm: boolean) => {
          if (confirm) {
            this.onCommit.emit(this.getCurrentMapping(false));
          } else {
            this.mapping.snoopStatus = SnoopStatus.NONE
            event.stepper.next();
          }
        })
      } else if (this.mapping.snoopStatus == SnoopStatus.STARTED) {
        console.log("Continue snoop ...?");
        const modalRef: BsModalRef = this.bsModalService.show(SnoopingModalComponent, { initialState });
        modalRef.content.closeSubject.subscribe((confirm: boolean) => {
          if (confirm) {
            this.mapping.snoopStatus = SnoopStatus.STOPPED
            if (numberSnooped > 0) {
              this.templateSource = JSON.parse(this.mapping.snoopedTemplates[0]);
              let levels: String[] = splitTopicExcludingSeparator(this.mapping.templateTopicSample);
              if (this.stepperConfiguration.direction == Direction.INBOUND) {
                this.templateSource = this.expandExternalTemplate(this.templateSource, levels);
              } else {
                this.templateSource = this.expandC8YTemplate(this.templateSource);
              }
              this.onSampleTargetTemplatesButton();
            }
            event.stepper.next();
          } else {
            this.onCancel.emit();
          }
        })
      } else {
        event.stepper.next();
      }
    } else if (this.step == "Define templates and substitutions") {
      this.getTemplateForm();
      this.editorTestingRequest.set(this.editorSource ? this.editorSource.get() : {} as JSON);
      this.onSelectSubstitution(0);
      event.stepper.next();
    }

  }

  private enrichTemplates() {
    let levels: String[] = splitTopicExcludingSeparator(this.mapping.templateTopicSample);

    if (this.stepperConfiguration.editorMode == EditorMode.CREATE) {
      if (this.stepperConfiguration.direction == Direction.INBOUND) {
        this.templateSource = this.expandExternalTemplate(JSON.parse(getExternalTemplate(this.mapping)), levels);
        this.templateTarget = this.expandC8YTemplate(JSON.parse(SAMPLE_TEMPLATES_C8Y[this.mapping.targetAPI]));
      } else {
        this.templateSource = this.expandC8YTemplate(JSON.parse(SAMPLE_TEMPLATES_C8Y[this.mapping.targetAPI]));
        this.templateTarget = this.expandExternalTemplate(JSON.parse(getExternalTemplate(this.mapping)), levels);

      }
      console.log("Sample template", this.templateTarget, getSchema(this.mapping.targetAPI, this.mapping.direction, true));
    } else {
      if (this.stepperConfiguration.direction == Direction.INBOUND) {
        this.templateSource = this.expandExternalTemplate(JSON.parse(this.mapping.source), levels);
        this.templateTarget = this.expandC8YTemplate(JSON.parse(this.mapping.target));
      } else {
        this.templateSource = this.expandC8YTemplate(JSON.parse(this.mapping.source));
        this.templateTarget = this.expandExternalTemplate(JSON.parse(this.mapping.target), levels);
      }
    }
  }

  async onSnoopedSourceTemplates() {
    if (this.snoopedTemplateCounter >= this.mapping.snoopedTemplates.length) {
      this.snoopedTemplateCounter = 0;
    }
    try {
      this.templateSource = JSON.parse(this.mapping.snoopedTemplates[this.snoopedTemplateCounter]);
    } catch (error) {
      this.templateSource = { message: this.mapping.snoopedTemplates[this.snoopedTemplateCounter] };
      console.warn("The payload was not in JSON format, now wrap it:", this.templateSource)
    }
    if (this.stepperConfiguration.direction == Direction.INBOUND) {
      this.templateSource = this.expandExternalTemplate(this.templateSource, splitTopicExcludingSeparator(this.mapping.templateTopicSample));
    } else {
      this.templateSource = this.expandC8YTemplate(this.templateSource);
    }
    this.mapping.snoopStatus = SnoopStatus.STOPPED;
    this.snoopedTemplateCounter++;
  }

  async onTargetAPIChanged(targetAPI) {
    this.mapping.targetAPI = targetAPI;
    if (this.stepperConfiguration.direction == Direction.INBOUND) {
      this.templateTarget = SAMPLE_TEMPLATES_C8Y[this.mapping.targetAPI];
    } else {
      this.templateTarget = getExternalTemplate(this.mapping);
    }
  }

  public onAddSubstitution() {
    this.getTemplateForm();
    if (this.currentSubstitution.pathSource != '' && this.currentSubstitution.pathTarget != '') {
      this.addSubstitution(this.currentSubstitution);
      this.selectedSubstitution = -1;
      console.log("New substitution", this.currentSubstitution, this.mapping.substitutions);
      this.currentSubstitution = {
        pathSource: '',
        pathTarget: '',
        repairStrategy: RepairStrategy.DEFAULT,
        expandArray: false
      };
      this.templateForm.updateValueAndValidity({ 'emitEvent': true });
    }
  }

  public onDeleteAllSubstitution() {
    this.mapping.substitutions = [];
    this.countDeviceIdentifers$.next(countDeviceIdentifiers(this.mapping));

    console.log("Cleared substitutions!");
  }

  public onDeleteSelectedSubstitution() {
    console.log("Delete selected substitution", this.selectedSubstitution);
    if (this.selectedSubstitution < this.mapping.substitutions.length) {
      this.mapping.substitutions.splice(this.selectedSubstitution, 1);
      this.selectedSubstitution = -1;
    }
    this.countDeviceIdentifers$.next(countDeviceIdentifiers(this.mapping));
    console.log("Deleted substitution", this.mapping.substitutions.length);

  }

  public onDeleteSubstitution(selected: number) {
    console.log("Delete selected substitution", selected);
    if (selected < this.mapping.substitutions.length) {
      this.mapping.substitutions.splice(selected, 1);
      selected = -1;
    }
    this.countDeviceIdentifers$.next(countDeviceIdentifiers(this.mapping));
    console.log("Deleted substitution", this.mapping.substitutions.length);

  }

  private addSubstitution(st: MappingSubstitution) {
    let sub: MappingSubstitution = _.clone(st);
    let existingSubstitution = -1;
    this.mapping.substitutions.forEach((s, index) => {
      if (sub.pathTarget == s.pathTarget) {
        existingSubstitution = index;
      }
    })

    if (existingSubstitution != -1) {
      const initialState = {
        substitution: this.mapping.substitutions[existingSubstitution],
        targetAPI: this.mapping.targetAPI,
        direction: this.mapping.direction
      }
      const modalRef: BsModalRef = this.bsModalService.show(OverwriteSubstitutionModalComponent, { initialState });
      modalRef.content.closeSubject.subscribe(
        (overwrite: boolean) => {
          console.log("Overwriting substitution I:", overwrite, this.mapping.substitutions);
          if (overwrite) {
            // when overwritting substitution then copy deviceIdentifier property
            this.mapping.substitutions[existingSubstitution] = sub;
          }
          this.templateForm.updateValueAndValidity({ 'emitEvent': true });
          console.log("Overwriting substitution II:", overwrite, this.mapping.substitutions);
        }
      );
    } else {
      this.mapping.substitutions.push(sub);
    }
    this.countDeviceIdentifers$.next(countDeviceIdentifiers(this.mapping));

  }

  public onNextSubstitution() {
    this.substitutionChild.scrollToSubstitution(this.selectedSubstitution);
    if (this.selectedSubstitution >= this.mapping.substitutions.length - 1) {
      this.selectedSubstitution = -1;
    }
    this.selectedSubstitution++;
    this.onSelectSubstitution(this.selectedSubstitution);
  }

  public onSelectSubstitution(selected: number) {
    if (selected < this.mapping.substitutions.length && selected > -1) {
      this.selectedSubstitution = selected
      this.currentSubstitution = _.clone(this.mapping.substitutions[selected])
      this.editorSource?.setSelectionToPath(this.currentSubstitution.pathSource);
      this.editorTarget.setSelectionToPath(this.currentSubstitution.pathTarget);
    }
  }

  private expandExternalTemplate(t: object, levels: String[]): object {
    if (Array.isArray(t)) {
      return t
    } else {
      return {
        ...t,
        _TOPIC_LEVEL_: levels
      };
    }
  }

  private expandC8YTemplate(t: object): object {
    if (this.mapping.targetAPI == API.INVENTORY.name) {
      return {
        ...t,
        _DEVICE_IDENT_: "909090"
      };
    } else {
      return t;
    }
  }

  private reduceSourceTemplate(t: object, patched: boolean): string {
    if (!patched) delete t[TOKEN_TOPIC_LEVEL];
    let tt = JSON.stringify(t);
    return tt;
  }

  private reduceTargetTemplate(t: object, patched: boolean): string {
    if (!patched) delete t[TOKEN_DEVICE_TOPIC];
    let tt = JSON.stringify(t);
    return tt;
  }
}