/**
 * Action type registry, sourced from verified/confirmed-type-strings.md
 * (live-fired workflow data -- highest confidence) and
 * schemas/action-trigger-types.md + schemas/action-schemas.md (GHL help
 * center + reverse-engineered JS bundle -- lower confidence, `confirmed:
 * false`). Per CLAUDE.md: "Always use type strings from
 * verified/confirmed-type-strings.md" and "Many doc type strings are WRONG".
 *
 * ACTION_TYPE_CORRECTIONS fixes the specific wrong-string cases CLAUDE.md
 * calls out. One CLAUDE.md-listed correction is deliberately NOT applied
 * here: it claims `internal_create_opportunity` should be `create_opportunity`,
 * but verified/confirmed-type-strings.md confirms `internal_create_opportunity`
 * from live *workflow builder* data and explicitly documents `create_opportunity`
 * as the unrelated *campaign builder v1* string for the same UI action. The
 * live-workflow-data source wins; see the note on that registry entry.
 */

export interface ActionTypeInfo {
  type: string;
  uiName: string;
  category: string;
  confirmed: boolean;
  branching?: boolean;
  notes?: string;
}

export const ACTION_TYPES: ActionTypeInfo[] = [
  // --- Confirmed live from real workflow templates JSON (2026-03-18) ---
  { type: "add_contact_tag", uiName: "Add Contact Tag", category: "Contact", confirmed: true },
  { type: "remove_contact_tag", uiName: "Remove Contact Tag", category: "Contact", confirmed: true, notes: "Include a redundant top-level `type: \"remove_contact_tag\"` in attributes too -- documented GHL quirk." },
  { type: "sms", uiName: "Send SMS", category: "Communication", confirmed: true },
  { type: "email", uiName: "Send Email", category: "Communication", confirmed: true },
  { type: "wait", uiName: "Wait", category: "Internal Tools", confirmed: true, notes: 'attributes.startAfter.type must be "hour" (singular), not "hours" -- confirmed 2026-03-23.' },
  { type: "if_else", uiName: "If/Else", category: "Internal Tools", confirmed: true, branching: true },
  { type: "assign_user", uiName: "Assign to User", category: "Contact", confirmed: true },
  { type: "add_to_workflow", uiName: "Add to Workflow", category: "Internal Tools", confirmed: true },
  { type: "remove_from_workflow", uiName: "Remove from Workflow", category: "Internal Tools", confirmed: true },
  { type: "update_contact_field", uiName: "Update Contact Field", category: "Contact", confirmed: true },
  { type: "find_opportunity", uiName: "Find Opportunity", category: "Opportunities", confirmed: true, branching: true, notes: "Needs a pipeline_id filter in __customInputFields__ or the API rejects it as \"corrupted type\"." },
  {
    type: "internal_create_opportunity",
    uiName: "Create Opportunity",
    category: "Opportunities",
    confirmed: true,
    notes:
      "Confirmed from live workflow builder v2 data. `create_opportunity` is a DIFFERENT, campaign-builder-v1-only string for the same UI action -- do not substitute it here.",
  },
  { type: "internal_update_opportunity", uiName: "Update Opportunity", category: "Opportunities", confirmed: true },
  { type: "internal_notification", uiName: "Send Internal Notification", category: "Team", confirmed: true },
  { type: "slack_message", uiName: "Send Slack Message", category: "Communication", confirmed: true },
  { type: "goto", uiName: "Go To", category: "Internal Tools", confirmed: true, notes: "Must be nested inside an if_else branch." },
  { type: "transition", uiName: "Transition (branch marker)", category: "Structural", confirmed: true, notes: "Structural only, no attributes. Must be a child of workflow_split, if_else, or a multi-path wait/find_opportunity node." },

  // --- Corrected per CLAUDE.md gotchas (doc tables list the wrong string) ---
  {
    type: "create_update_contact",
    uiName: "Create Contact",
    category: "Contact",
    confirmed: true,
    notes: 'GHL help-center docs say "create_contact" -- the API rejects that as "corrupted type". Correct string is "create_update_contact".',
  },
  {
    type: "chatgpt",
    uiName: "AI Prompt (GPT Powered)",
    category: "Workflow AI",
    confirmed: true,
    notes: 'Docs say "openai_completion" -- correct string is "chatgpt".',
  },
  {
    type: "workflow_split",
    uiName: "Split (A/B Test)",
    category: "Internal Tools",
    confirmed: true,
    branching: true,
    notes: 'Docs say "split" -- correct string is "workflow_split".',
  },
  {
    type: "datetime_formatter",
    uiName: "Date/Time Formatter",
    category: "Internal Tools",
    confirmed: true,
    notes: 'Docs say "date_formatter" -- correct string is "datetime_formatter".',
  },

  // --- Inferred from GHL help center / naming conventions -- NOT yet live-verified ---
  { type: "find_contact", uiName: "Find Contact", category: "Contact", confirmed: false },
  { type: "remove_assigned_user", uiName: "Remove Assigned User", category: "Contact", confirmed: false },
  { type: "edit_conversation", uiName: "Edit Conversation", category: "Contact", confirmed: false },
  { type: "set_dnd", uiName: "Disable/Enable DND", category: "Contact", confirmed: false },
  { type: "add_note", uiName: "Add Note", category: "Contact", confirmed: false },
  { type: "add_task", uiName: "Add Task", category: "Contact", confirmed: false },
  { type: "copy_contact", uiName: "Copy Contact", category: "Contact", confirmed: false },
  { type: "delete_contact", uiName: "Delete Contact", category: "Contact", confirmed: false },
  { type: "modify_engagement_score", uiName: "Modify Contact Engagement Score", category: "Contact", confirmed: false },
  { type: "contact_followers", uiName: "Add/Remove Contact Followers", category: "Contact", confirmed: false },
  { type: "add_contact_to_dnd", uiName: "Add Contact to DND", category: "Contact", confirmed: false },
  { type: "remove_contact_from_dnd", uiName: "Remove Contact from DND", category: "Contact", confirmed: false },

  { type: "call", uiName: "Call", category: "Communication", confirmed: false },
  { type: "voicemail_drop", uiName: "Voicemail Drop", category: "Communication", confirmed: false },
  { type: "voicemail", uiName: "Voicemail (ringless drop)", category: "Communication", confirmed: false },
  { type: "manual_call", uiName: "Manual Call Task", category: "Communication", confirmed: false },
  { type: "facebook_message", uiName: "Messenger (Facebook)", category: "Communication", confirmed: false },
  { type: "instagram_message", uiName: "Instagram DM", category: "Communication", confirmed: false },
  { type: "whatsapp", uiName: "WhatsApp", category: "Communication", confirmed: false },
  { type: "gmb_message", uiName: "GMB Messaging", category: "Communication", confirmed: false },
  { type: "live_chat_message", uiName: "Send Live Chat Message", category: "Communication", confirmed: false },
  { type: "manual_action", uiName: "Manual Action", category: "Communication", confirmed: false },
  { type: "send_review_request", uiName: "Send Review Request", category: "Communication", confirmed: false },
  { type: "conversation_ai", uiName: "Conversation AI", category: "Communication", confirmed: false },
  { type: "fb_interactive_messenger", uiName: "Facebook Interactive Messenger", category: "Communication", confirmed: false },
  { type: "ig_interactive_messenger", uiName: "Instagram Interactive Messenger", category: "Communication", confirmed: false },
  { type: "reply_in_comments", uiName: "Reply in Comments", category: "Communication", confirmed: false, notes: "Requires a facebook_comment_on_post or ig_comment_on_post trigger upstream." },

  { type: "webhook", uiName: "Webhook / Custom Webhook", category: "Send Data", confirmed: false },
  { type: "custom_webhook", uiName: "Custom Webhook (inbound wait)", category: "Send Data", confirmed: false },
  { type: "google_sheets", uiName: "Google Sheets", category: "Send Data", confirmed: false },

  { type: "goal_event", uiName: "Goal Event", category: "Internal Tools", confirmed: false },
  { type: "update_custom_value", uiName: "Update Custom Value", category: "Internal Tools", confirmed: false },
  { type: "drip", uiName: "Drip Mode", category: "Internal Tools", confirmed: false },
  { type: "text_formatter", uiName: "Text Formatter", category: "Internal Tools", confirmed: false },
  { type: "number_formatter", uiName: "Number Formatter", category: "Internal Tools", confirmed: false },
  { type: "math_operation", uiName: "Math Operation", category: "Internal Tools", confirmed: false },
  { type: "custom_code", uiName: "Custom Code", category: "Internal Tools", confirmed: false },
  { type: "arrays", uiName: "Arrays", category: "Internal Tools", confirmed: false },
  { type: "end", uiName: "End Workflow", category: "Internal Tools", confirmed: false },

  { type: "ai_summarize", uiName: "AI Summarize", category: "Workflow AI", confirmed: false },

  { type: "eliza_appointment", uiName: "Eliza AI Appointment Booking", category: "Eliza AI", confirmed: false },
  { type: "eliza_agent", uiName: "Send to Eliza Agent Platform", category: "Eliza AI", confirmed: false },

  { type: "update_appointment_status", uiName: "Update Appointment Status", category: "Appointments", confirmed: false },
  { type: "booking_link", uiName: "Generate One Time Booking Link", category: "Appointments", confirmed: false },

  { type: "remove_opportunity", uiName: "Remove Opportunity", category: "Opportunities", confirmed: false },
  { type: "delete_opportunity", uiName: "Delete Opportunity", category: "Opportunities", confirmed: false },

  { type: "stripe_one_time_charge", uiName: "Stripe One-Time Charge", category: "Payments", confirmed: false },
  { type: "send_invoice", uiName: "Send Invoice", category: "Payments", confirmed: false },
  { type: "send_document", uiName: "Send Documents and Contracts", category: "Payments", confirmed: false },
  { type: "create_invoice", uiName: "Create Invoice", category: "Payments", confirmed: false },
  { type: "create_text2pay", uiName: "Create Text-to-Pay Link", category: "Payments", confirmed: false },

  { type: "google_analytics", uiName: "Add to Google Analytics", category: "Marketing", confirmed: false },
  { type: "google_adwords", uiName: "Add to Google AdWords", category: "Marketing", confirmed: false },
  { type: "fb_add_custom_audience", uiName: "Add to Custom Audience (Facebook)", category: "Marketing", confirmed: false },
  { type: "fb_remove_custom_audience", uiName: "Remove from Custom Audience (Facebook)", category: "Marketing", confirmed: false },
  { type: "fb_conversion_api", uiName: "Facebook Conversion API", category: "Marketing", confirmed: false },
  { type: "google_calendar_event", uiName: "Google Calendar Event", category: "Marketing", confirmed: false },
  { type: "google_ads_conversion", uiName: "Google Ads Conversion", category: "Marketing", confirmed: false },
  { type: "tiktok_conversion", uiName: "TikTok Conversion", category: "Marketing", confirmed: false },
  { type: "quickbooks", uiName: "QuickBooks Sync", category: "Marketing", confirmed: false },

  { type: "add_affiliate", uiName: "Add to Affiliate Manager", category: "Affiliate", confirmed: false },
  { type: "update_affiliate", uiName: "Update Affiliate", category: "Affiliate", confirmed: false },
  { type: "affiliate_campaign", uiName: "Add/Remove from Affiliate Campaign", category: "Affiliate", confirmed: false },

  { type: "course_grant_offer", uiName: "Course Grant Offer", category: "Courses", confirmed: false },
  { type: "course_revoke_offer", uiName: "Course Revoke Offer", category: "Courses", confirmed: false },

  { type: "ivr_gather_input", uiName: "Gather Input on Call", category: "IVR", confirmed: false },
  { type: "ivr_play_message", uiName: "Play Message", category: "IVR", confirmed: false },
  { type: "ivr_connect_call", uiName: "Connect to Call", category: "IVR", confirmed: false },
  { type: "ivr_end_call", uiName: "End Call", category: "IVR", confirmed: false },
  { type: "ivr_record_voicemail", uiName: "Record Voicemail", category: "IVR", confirmed: false },

  { type: "community_grant_access", uiName: "Grant Group Access", category: "Communities", confirmed: false },
  { type: "community_revoke_access", uiName: "Revoke Group Access", category: "Communities", confirmed: false },
];

export const ACTION_TYPE_MAP: ReadonlyMap<string, ActionTypeInfo> = new Map(ACTION_TYPES.map((a) => [a.type, a]));

/** Doc string (as written in schemas/*.md) -> corrected workflow-builder-v2 API string, per CLAUDE.md gotchas. */
export const ACTION_TYPE_CORRECTIONS: Readonly<Record<string, string>> = {
  create_contact: "create_update_contact",
  openai_completion: "chatgpt",
  split: "workflow_split",
  date_formatter: "datetime_formatter",
};

export interface ResolvedActionType {
  type: string;
  corrected: boolean;
  info?: ActionTypeInfo;
}

/** Applies known corrections and looks up registry metadata. Unknown types pass through unchanged (GHL's API is the final authority; see CLAUDE.md "Action save API validates type strings strictly"). */
export function resolveActionType(type: string): ResolvedActionType {
  const corrected = ACTION_TYPE_CORRECTIONS[type];
  const resolved = corrected ?? type;
  return { type: resolved, corrected: Boolean(corrected), info: ACTION_TYPE_MAP.get(resolved) };
}
