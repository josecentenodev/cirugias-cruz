/**
 * All user-facing copy for `packages/web`, in English (the primary
 * language — ADR 0023 / ROADMAP Milestone 10). One typed `as const`
 * object, imported directly:
 *
 *   import { messages } from "@/messages/en";
 *
 * Works unchanged in Server and Client Components, zero runtime cost,
 * tree-shakeable. When the app is internationalized this module becomes
 * the `en` catalog and the direct import is swapped for a
 * `getTranslations()` / `useTranslations()` shim — the keys stay.
 *
 * `brand.name` is a proper noun (matches the live domain) and is never
 * translated.
 */
export const messages = {
  brand: {
    name: "Seguimiento de Cirugías",
    tagline: "Surgical follow-up and clinical research for physicians",
  },

  common: {
    save: "Save",
    saveChanges: "Save changes",
    saving: "Saving…",
    cancel: "Cancel",
    edit: "Edit",
    add: "Add",
    adding: "Adding…",
    remove: "Remove",
    removing: "Removing…",
    delete: "Delete",
    deleting: "Deleting…",
    confirm: "Confirm",
    search: "Search",
    clear: "Clear",
    loading: "Loading…",
    logOut: "Log out",
    optional: "(optional)",
    none: "—",
    back: "Back",
    deleteWord: "DELETE",
    dangerousConfirm: {
      prompt: (phrase: string) => `Type ${phrase} to confirm`,
    },
  },

  nav: {
    patients: "Patients",
    staff: "Staff",
    research: "Research",
    settings: "Settings",
  },

  fields: {
    firstName: "First name",
    lastName: "Last name",
    phone: "Phone",
    email: "Email",
    dateOfBirth: "Date of birth",
    age: "Age",
    password: "Password",
    newPassword: "New password",
    name: "Name",
    description: "Description",
    descriptionOptional: "Description (optional)",
    observations: "Observations",
    observationsOptional: "Observations (optional)",
    dateAndTime: "Date & time",
    dni: "DNI",
    dniOptional: "DNI (optional)",
    status: "Status",
  },

  errors: {
    requiredFields: "Please fill in every required field.",
    generic: {
      title: "Something went wrong",
      body: "We couldn’t complete that request. Please try again.",
      retry: "Try again",
    },
    notFound: {
      title: "Not found",
      body: "That page, or the resource it refers to, doesn’t exist.",
      home: "Back to patients",
    },
  },

  auth: {
    login: {
      title: "Sign in",
      subtitle: "Sign in to your account",
      submit: "Sign in",
      submitting: "Signing in…",
      sessionExpired: "Your session ended — please log in again.",
      noAccount: "Don’t have an account?",
      createOne: "Create one",
    },
    resendConfirmation: {
      prompt: "Didn't get the email?",
      button: "Resend confirmation email",
      sending: "Sending…",
      sent: "If that email is registered and unconfirmed, we've sent a new confirmation link.",
    },
    signup: {
      title: "Create your account",
      submit: "Create account",
      submitting: "Creating account…",
      haveAccount: "Already have an account?",
      signIn: "Sign in",
    },
    checkEmail: {
      title: "Check your email",
      subtitle:
        "We sent a confirmation link to the address you registered with. Open it to activate your account.",
      confirmed: "Already confirmed?",
      signIn: "Sign in",
    },
    confirmEmail: {
      confirmedTitle: "Account confirmed",
      failedTitle: "Confirmation failed",
      confirmedBody: "Your account is confirmed. You can sign in now.",
      missingToken: "This confirmation link is missing its token.",
      goToSignIn: "Go to sign in",
    },
    acceptInvitation: {
      title: "Accept your invitation",
      subtitle:
        "Your physician invited you to Seguimiento de Cirugías. Set your password to continue.",
      missingToken: "This invitation link is missing its token.",
      submit: "Accept invitation",
      submitting: "Accepting…",
      accepted: "Invitation accepted — you can sign in now.",
    },
  },

  patients: {
    listTitle: "Patients",
    register: "Register patient",
    registering: "Registering…",
    newTitle: "Register patient",
    detailsCard: "Patient details",
    searchPlaceholder: "Search by name or DNI",
    searchLabel: "Search patients",
    noMatch: (query: string) => `No patients match “${query}”.`,
    backToList: "Back to patients",
    columns: {
      name: "Name",
      dni: "DNI",
      age: "Age",
      dateOfBirth: "Date of birth",
    },
    detail: {
      observations: "Observations",
    },
    empty: {
      title: "No patients yet",
      hint: "Register your first patient to start tracking their surgeries and controls.",
      cta: "Register your first patient",
    },
  },

  surgeries: {
    sectionTitle: "Surgeries",
    register: "Register surgery",
    registering: "Registering…",
    registerFor: (patient: string) => `Register surgery for ${patient}`,
    detailsCard: "Surgery details",
    backToPatient: "Back to patient",
    procedureType: "Procedure type",
    selectProcedureType: "Select a procedure type",
    performedDate: "Performed date",
    performed: "Performed",
    controls: "Controls",
    columns: {
      procedureType: "Procedure type",
      performed: "Performed",
      controls: "Controls",
    },
    empty: {
      title: "No surgeries yet",
      hint: "Register this patient’s first surgery to begin recording controls.",
      cta: "Register the first surgery",
    },
    residents: {
      cardTitle: "Residents",
      assignAction: "Assign a resident",
      empty: "No residents assigned yet.",
      assign: "Assign",
      assigning: "Assigning…",
      selectResident: "Select a resident",
      assignLabel: "Resident to assign",
      noneRegistered: "No residents registered yet — register one first.",
      allAssigned: "Every registered resident is already assigned.",
      removeConfirm: (name: string) =>
        `Remove ${name} from this surgery? They can be re-assigned unless they have recorded a control.`,
    },
    controlHistory: {
      cardTitle: "Control history",
      empty: "No controls recorded yet.",
      controlType: "Control type",
      adHoc: "Ad-hoc",
    },
    followUp: {
      cardTitle: "Follow-up schedule",
      empty: "No capped control types defined for this procedure.",
    },
    recordControl: {
      cardTitle: "Record a control",
      submit: "Record control",
      submitting: "Recording…",
      recordedBy: "Recorded by",
      physicianOption: "You (physician)",
      residentOption: "A participating resident",
      noResidentsHint: "(none currently assigned to this surgery)",
      resident: "Resident",
      selectResident: "Select a resident",
      controlType: "Control type",
      controlTypeNone: "Ad-hoc (no type)",
      now: "Now",
      atLimit: (name: string) =>
        `"${name}" already has all of its expected recordings on this surgery.`,
    },
    controlRow: {
      save: "Save",
      saving: "Saving…",
    },
  },

  research: {
    listTitle: "Research",
    register: "Register study",
    registering: "Registering…",
    newTitle: "Register research study",
    detailsCard: "Study details",
    backToList: "Back to research",
    cardTitle: "Research study",
    statusCardTitle: "Status",
    fields: {
      hypothesis: "Hypothesis",
      results: "Results",
      analysis: "Analysis",
      conclusion: "Conclusion",
    },
    columns: {
      hypothesis: "Hypothesis",
      status: "Status",
      surgeries: "Surgeries",
    },
    status: {
      DRAFT: "Draft",
      IN_PROGRESS: "In progress",
      COMPLETED: "Completed",
    },
    transitions: {
      start: "Start",
      starting: "Starting…",
      complete: "Complete",
      completing: "Completing…",
      reopen: "Reopen",
      reopening: "Reopening…",
    },
    delete: {
      label: "Delete study",
      confirm: "Delete this draft study? This can’t be undone.",
    },
    surgeries: {
      cardTitle: "Surgeries",
      empty: "No surgeries added yet.",
      completedLocked: "A completed study’s surgery universe is locked — reopen it to change.",
      allAdded: "Every registered surgery is already part of this study.",
      add: "Add",
      adding: "Adding…",
      select: "Select a surgery",
      selectLabel: "Surgery to add",
      removeConfirm: "Remove this surgery from the study?",
      unknown: "Unknown surgery",
    },
    empty: {
      title: "No research studies yet",
      hint: "Create a study to group surgeries and record your hypothesis, analysis, and conclusions.",
      cta: "Register your first study",
    },
  },

  procedureTypes: {
    listTitle: "Procedure types",
    register: "Register procedure type",
    registering: "Registering…",
    newTitle: "Register procedure type",
    detailsCard: "Procedure type details",
    backToSettings: "Back to Settings",
    editSubmit: "Save changes",
    columns: {
      name: "Name",
      description: "Description",
    },
    empty: {
      title: "No procedure types yet",
      hint: "A procedure type is required before you can register a surgery — define your first one here.",
      cta: "Register your first procedure type",
    },
    customFields: {
      cardTitle: "Custom fields",
      addCardTitle: "Add a custom field",
      addSubmit: "Add custom field",
      adding: "Adding…",
      empty: "No custom fields defined yet.",
      recordedOn: "Recorded on",
      scopeSurgery: "The surgery itself (once)",
      scopeControl: "Each control (repeated over time)",
      scopeSurgeryShort: "Surgery",
      scopeControlShort: "Control",
      valueType: "Value type",
      valueTypeNumber: "Number",
      valueTypeEnum: "One of a fixed list of options",
      valueTypeText: "Free text",
      unitOptional: "Unit (optional)",
      unitPlaceholder: "e.g. mmHg, 0-10",
      minOptional: "Minimum (optional)",
      maxOptional: "Maximum (optional)",
      optionsLabel: "Options (one per line)",
      maxLengthOptional: "Maximum length (optional)",
      columns: {
        name: "Name",
        scope: "Scope",
        type: "Type",
        rules: "Rules",
        unit: "Unit",
      },
      edit: "Edit",
      remove: "Remove",
      frozenHint: "Recorded data exists — add a new field instead.",
    },
    controlDefinitions: {
      cardTitle: "Control types",
      addCardTitle: "Add a control type",
      addSubmit: "Add control type",
      editSubmit: "Save control type",
      adding: "Adding…",
      empty: "No control types defined yet — controls can still be recorded ad-hoc.",
      nameLabel: "Name",
      modeLabel: "Recording cap",
      modeUncapped: "Uncapped (record any number of times)",
      modeCapped: "Capped (a fixed number, on a schedule)",
      countLabel: "Expected recordings",
      everyLabel: "Every",
      unitLabel: "Period unit",
      unitHours: "hours",
      unitDays: "days",
      unitWeeks: "weeks",
      edit: "Edit",
      remove: "Remove",
      frozenHint: "Recorded data exists — add a new control type instead.",
      columns: {
        name: "Name",
        rule: "Recording rule",
      },
      removeConfirm: (name: string) => `Remove the "${name}" control type?`,
    },
  },

  residents: {
    listTitle: "Staff",
    register: "Register resident",
    registering: "Registering…",
    newTitle: "Register resident",
    detailsCard: "Resident details",
    columns: {
      name: "Name",
      phone: "Phone",
      email: "Email",
      dateOfBirth: "Date of birth",
      status: "Status",
      credential: "Credential",
    },
    active: "Active",
    inactive: "Inactive",
    empty: {
      title: "No staff yet",
      hint: "Register a resident to assign them to surgeries and let them record controls.",
      cta: "Register your first resident",
    },
    credentials: {
      resendInvitation: "Resend invitation",
      resendingInvitation: "Resending…",
      deactivate: "Deactivate",
      reactivate: "Reactivate",
      reactivated: "Resident reactivated.",
      deactivated: "Resident deactivated.",
      invitationResent: "Invitation resent — the previous one no longer works.",
      invitationPending: "Invitation sent, not yet accepted.",
      invitationAccepted: "Invitation accepted.",
      deactivateConfirm: (name: string) =>
        `Deactivate ${name}’s login? They won’t be able to sign in until reactivated.`,
    },
  },

  resident: {
    nav: {
      mySurgeries: "My surgeries",
    },
    surgeriesTitle: "My surgeries",
    surgeryTitle: "Surgery",
    surgeryMeta: (patient: string, procedure: string, performed: string) =>
      `Patient ${patient} · Procedure ${procedure} · ${performed}`,
    columns: {
      patient: "Patient",
      procedureType: "Procedure type",
      performed: "Performed",
      controls: "Controls",
    },
    empty: {
      title: "No surgeries yet",
      hint: "You aren’t participating in any surgery yet. Your physician assigns you to surgeries.",
    },
    controls: {
      cardTitle: "Controls",
      empty: "No controls recorded yet.",
    },
    recordControl: {
      cardTitle: "Record a control",
      submit: "Record control",
      submitting: "Recording…",
    },
    changePassword: {
      title: "Set your password",
      subtitle:
        "Choose a password only you know. You won’t be able to do anything else until you set one.",
      submit: "Set new password",
      submitting: "Saving…",
    },
  },
} as const;
