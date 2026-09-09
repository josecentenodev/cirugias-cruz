import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messages } from "@/messages/en";
import type { ProcedureTypeDetailView } from "../mappers";
import { ControlDefinitionForm } from "./ControlDefinitionForm";
import { ControlDefinitionList } from "./ControlDefinitionList";
import { CustomFieldForm } from "./CustomFieldForm";
import { CustomFieldList } from "./CustomFieldList";
import { ProcedureTypeEditForm } from "./ProcedureTypeEditForm";

/**
 * Server Component — mirrors `SurgeryDetail.tsx`'s shape exactly:
 * "aggregate's own fields" card, "child collection" card, "add one to
 * the collection" card. `ProcedureTypeEditForm` and `CustomFieldForm`
 * are the only interactive pieces; everything else here needs no
 * client-side state.
 */
export function ProcedureTypeDetail({ procedureType }: { procedureType: ProcedureTypeDetailView }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{procedureType.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProcedureTypeEditForm procedureType={procedureType} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{messages.procedureTypes.customFields.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomFieldList
            procedureTypeId={procedureType.id}
            customFields={procedureType.customFields}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{messages.procedureTypes.customFields.addCardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomFieldForm procedureTypeId={procedureType.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{messages.procedureTypes.controlDefinitions.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ControlDefinitionList
            procedureTypeId={procedureType.id}
            controlDefinitions={procedureType.controlDefinitions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{messages.procedureTypes.controlDefinitions.addCardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ControlDefinitionForm procedureTypeId={procedureType.id} />
        </CardContent>
      </Card>
    </div>
  );
}
