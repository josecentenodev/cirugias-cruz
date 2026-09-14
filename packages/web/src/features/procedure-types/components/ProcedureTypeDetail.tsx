import { DetailGrid } from "@/components/DetailGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/Disclosure";
import { messages } from "@/messages/en";
import type { ProcedureTypeDetailView } from "../mappers";
import { ControlDefinitionForm } from "./ControlDefinitionForm";
import { ControlDefinitionList } from "./ControlDefinitionList";
import { CustomFieldForm } from "./CustomFieldForm";
import { CustomFieldList } from "./CustomFieldList";
import { ProcedureTypeEditForm } from "./ProcedureTypeEditForm";

/**
 * Server Component. `DetailGrid` (desktop-space-usage.md §4.1): the two
 * scheme editors — the reason a physician opens this screen — are the
 * primary column; the procedure type's own name/description, edited
 * rarely, sits in the sticky aside. Each scheme's "add" form is folded
 * into a `Disclosure` at the foot of its own card (§3 P3/P4), open by
 * default only while that collection is still empty.
 */
export function ProcedureTypeDetail({ procedureType }: { procedureType: ProcedureTypeDetailView }) {
  const cf = messages.procedureTypes.customFields;
  const cd = messages.procedureTypes.controlDefinitions;

  return (
    <DetailGrid
      primary={
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{cf.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <CustomFieldList
                procedureTypeId={procedureType.id}
                customFields={procedureType.customFields}
              />
              <Disclosure
                summary={cf.addCardTitle}
                defaultOpen={procedureType.customFields.length === 0}
              >
                <CustomFieldForm procedureTypeId={procedureType.id} />
              </Disclosure>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{cd.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ControlDefinitionList
                procedureTypeId={procedureType.id}
                controlDefinitions={procedureType.controlDefinitions}
              />
              <Disclosure
                summary={cd.addCardTitle}
                defaultOpen={procedureType.controlDefinitions.length === 0}
              >
                <ControlDefinitionForm procedureTypeId={procedureType.id} />
              </Disclosure>
            </CardContent>
          </Card>
        </div>
      }
      aside={
        <Card>
          <CardHeader>
            <CardTitle>{procedureType.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProcedureTypeEditForm procedureType={procedureType} />
          </CardContent>
        </Card>
      }
    />
  );
}
