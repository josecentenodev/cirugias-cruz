import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProcedureTypeDetailView } from "../mappers";
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
          <CardTitle>Custom fields</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomFieldList customFields={procedureType.customFields} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a custom field</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomFieldForm procedureTypeId={procedureType.id} />
        </CardContent>
      </Card>
    </div>
  );
}
