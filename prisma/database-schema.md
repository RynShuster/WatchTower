# WatchTower database schema

**Source of truth:** `schema.prisma` (Prisma). Apply with `npx prisma db push` (SQLite dev) or migrations (PostgreSQL prod).

## Entity–relationship (logical)

```mermaid
erDiagram
  Location ||--o{ Machine : "locationId"
  MachineMake ||--o{ MachineModel : "makeId"
  MachineModel ||--o{ Machine : "modelId"
  MachineType ||--o{ Machine : "typeId"
  MachineType ||--o{ ChecklistItem : "machineTypeId (opt)"
  Machine ||--o{ HealthSubmission : "machineId"
  HealthSubmission ||--o| ServiceRequest : "submissionId (1:1)"
  HealthSubmission ||--o{ HealthSubmissionAnswer : "submissionId"
  HealthSubmission ||--o{ SubmissionAttachment : "submissionId"
  ChecklistItem ||--o{ HealthSubmissionAnswer : "itemId"
  ServiceRequest ||--o{ OperationsFeedback : "serviceRequestId"

  Location {
    string id PK
    string code "optional; e.g. F2, D01"
    string site "city / state label"
    string building "optional"
    string line "optional"
    datetime createdAt
    datetime updatedAt
  }

  MachineMake {
    string id PK
    string name UK
    datetime createdAt
    datetime updatedAt
  }

  MachineModel {
    string id PK
    string name
    string makeId FK
    datetime createdAt
    datetime updatedAt
  }

  MachineType {
    string id PK
    string code UK
    string displayName
    datetime createdAt
    datetime updatedAt
  }

  Machine {
    string id PK
    string internalAssetId "optional; unique when present"
    string serial "optional"
    enum status
    string notes "optional"
    string locationId FK
    string makeId FK
    string modelId FK
    string typeId FK
    datetime createdAt
    datetime updatedAt
  }

  ChecklistItem {
    string id PK
    string key UK
    string label
    enum fieldType
    boolean required
    int sortOrder
    string machineTypeId FK "optional"
    datetime createdAt
    datetime updatedAt
  }

  HealthSubmission {
    string id PK
    string machineId FK
    datetime submittedAt
    string submittedById "optional"
    string submittedByLabel "optional"
    string summaryNotes "optional"
    string metrics "JSON text, default {}"
    datetime createdAt
    datetime updatedAt
  }

  HealthSubmissionAnswer {
    string id PK
    string submissionId FK
    string itemId FK
    float valueNumber "optional"
    boolean valueBoolean "optional"
    string valueText "optional"
    datetime createdAt
    datetime updatedAt
  }

  SubmissionAttachment {
    string id PK
    string submissionId FK
    string originalName
    string storedPath
    string mimeType
    int sizeBytes
    datetime uploadedAt
  }

  ServiceRequest {
    string id PK
    string submissionId FK UK
    enum priority
    string description "optional"
    enum status
    datetime createdAt
    datetime updatedAt
  }

  OperationsFeedback {
    string id PK
    string serviceRequestId FK
    string authorId "optional"
    string authorLabel "optional"
    string comment
    string decision "optional"
    datetime createdAt
  }
```

## Enums

| Enum | Values |
|------|--------|
| `MachineStatus` | OPERATIONAL, DEGRADED, DOWN, MAINTENANCE, RETIRED |
| `ChecklistFieldType` | NUMBER, BOOLEAN, TEXT |
| `ServiceRequestPriority` | LOW, NORMAL, HIGH, CRITICAL |
| `ServiceRequestStatus` | SUBMITTED, UNDER_REVIEW, APPROVED, DEFERRED, REJECTED, SCHEDULED |

## Uniques and constraints (high level)

- `MachineMake.name` — unique.
- `MachineModel` — unique on `(makeId, name)`.
- `MachineType.code` — unique.
- `Machine.internalAssetId` — unique when present.
- `ChecklistItem.key` — unique.
- `HealthSubmissionAnswer` — unique on `(submissionId, itemId)` (one answer per checklist item per submission).
- `ServiceRequest.submissionId` — unique (at most one service request per health submission).
- Foreign keys use `Restrict` on taxonomy deletes where machines still reference rows; submissions cascade from `Machine`.

## Machine seed JSON mapping

Seed JSON fields map to:

| Column | Model / field |
|--------|----------------|
| makeID | `MachineMake.name` |
| modelID | `MachineModel.name` (+ `makeId`) |
| typeID | `MachineType.displayName` (+ generated `code`) |
| locationID | `Location.code` |
| citystateID | `Location.site` |
| lineID | `Location.line` |
| serialID | `Machine.serial` |
| assetID | `Machine.internalAssetId` |

Rows are seeded from `machineList.import.json`. `machineList.xlsx` is now an optional import source, not the canonical source of truth.
