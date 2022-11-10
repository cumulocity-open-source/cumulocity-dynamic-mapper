import { NgModule } from '@angular/core';
import { CoreModule } from '@c8y/ngx-components';
import { MappingTreeComponent } from './tree.component';
import { JsonEditorComponent } from '../shared/editor/jsoneditor.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    MappingTreeComponent
  ],
  imports: [
    CoreModule,
    SharedModule,
  ],
  entryComponents: [
    MappingTreeComponent,
    JsonEditorComponent,
  ],
  exports: [],
  providers: []
})
export class MappingTreeModule {}