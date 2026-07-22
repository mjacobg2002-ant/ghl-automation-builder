/**
 * Trigger type registry. Two sources disagree on several strings:
 *
 *  - verified/confirmed-type-strings.md: 4 types confirmed from LIVE trigger
 *    JSON fired inside real workflows (contact_tag_added, appointment,
 *    contact_created, form_submitted).
 *  - schemas/trigger-schemas.md: 57 types extracted from static analysis of
 *    the workflow builder v2 JS bundle (e.g. contact_tag, form_submission),
 *    explicitly flagged in that file as needing live verification.
 *
 * Where they overlap and disagree (contact_tag vs contact_tag_added,
 * form_submission vs form_submitted), this registry keeps BOTH entries but
 * marks the live-fired one `confirmed: true` and prefers it in
 * lookupTriggerType(); the JS-bundle string is kept as `confirmed: false`
 * with a note, since it may be correct for a code path this repo hasn't
 * exercised live. Unlike actions, triggers are NOT auto-corrected (no single
 * unambiguous fix documented) -- callers get the full info and decide.
 */

export interface TriggerTypeInfo {
  type: string;
  uiName: string;
  category: string;
  confirmed: boolean;
  requiredConditionFields?: string[];
  notes?: string;
}

export const TRIGGER_TYPES: TriggerTypeInfo[] = [
  // --- Confirmed live from real trigger JSON (2026-03-18) ---
  { type: "contact_tag_added", uiName: "Contact Tag Added", category: "Contact", confirmed: true, requiredConditionFields: ["contact.tags"], notes: 'schemas/trigger-schemas.md (static JS extraction) lists "contact_tag" for this same UI action; live-fired data confirms this string instead. Prefer this one.' },
  { type: "appointment", uiName: "Appointment Status", category: "Appointments", confirmed: true, requiredConditionFields: ["calendar.id", "appointment.status", "appointment.eventType"] },
  { type: "contact_created", uiName: "Contact Created", category: "Contact", confirmed: true },
  { type: "form_submitted", uiName: "Form Submitted", category: "Form & Survey", confirmed: true, requiredConditionFields: ["form.id"], notes: 'schemas/trigger-schemas.md (static JS extraction) lists "form_submission" for this same UI action; live-fired data confirms this string instead. Prefer this one.' },

  // --- Confirmed via workflow builder v2 JS bundle static extraction (schemas/trigger-schemas.md), pending live verification ---
  { type: "contact_tag", uiName: "Contact Tag Added/Removed (JS-extracted candidate)", category: "Contact", confirmed: false, requiredConditionFields: ["tagsAdded"], notes: "Contradicted by live data -- see contact_tag_added." },
  { type: "contact_changed", uiName: "Contact Changed", category: "Contact", confirmed: false },
  { type: "dnd_contact", uiName: "Contact DND", category: "Contact", confirmed: false },
  { type: "birthday_reminder", uiName: "Birthday Reminder", category: "Contact", confirmed: false },
  { type: "customer_reply", uiName: "Customer Replied", category: "Communication", confirmed: false },
  { type: "call_status", uiName: "Call Details", category: "Communication", confirmed: false },
  { type: "mailgun_email_event", uiName: "Email Events", category: "Communication", confirmed: false },
  { type: "form_submission", uiName: "Form Submitted (JS-extracted candidate)", category: "Form & Survey", confirmed: false, requiredConditionFields: ["form.id"], notes: "Contradicted by live data -- see form_submitted." },
  { type: "survey_submission", uiName: "Survey Submitted", category: "Form & Survey", confirmed: false, requiredConditionFields: ["survey.id"] },
  { type: "trigger_link", uiName: "Trigger Link Clicked", category: "Form & Survey", confirmed: false },
  { type: "video_event", uiName: "Video Tracking", category: "Form & Survey", confirmed: false },
  { type: "customer_appointment", uiName: "Customer Booked Appointment", category: "Appointments", confirmed: false, requiredConditionFields: ["calendar.id"] },
  { type: "opportunity_status_changed", uiName: "Opportunity Status Changed", category: "Opportunities", confirmed: false, requiredConditionFields: ["opportunity.pipelineId", "opportunity.pipelineStageId"] },
  { type: "opportunity_created", uiName: "Opportunity Created", category: "Opportunities", confirmed: false },
  { type: "opportunity_changed", uiName: "Opportunity Changed", category: "Opportunities", confirmed: false },
  { type: "pipeline_stage_updated", uiName: "Pipeline Stage Changed", category: "Opportunities", confirmed: false },
  { type: "opportunity_decay", uiName: "Stale Opportunities", category: "Opportunities", confirmed: false },
  { type: "payment_received", uiName: "Payment Received", category: "Payments", confirmed: false },
  { type: "invoice", uiName: "Invoice", category: "Payments", confirmed: false },
  { type: "order_submission", uiName: "Order Submitted", category: "Payments", confirmed: false },
  { type: "two_step_form_submission", uiName: "Order Form Submission", category: "Payments", confirmed: false, requiredConditionFields: ["twoStepOrderForm.funnelId", "twoStepOrderForm.pageId"] },
  { type: "shopify_abandoned_cart", uiName: "Shopify Abandoned Cart", category: "Ecommerce", confirmed: false, notes: "Deprecating per GHL help center." },
  { type: "shopify_order_placed", uiName: "Shopify Order Placed", category: "Ecommerce", confirmed: false },
  { type: "shopify_order_fulfilled", uiName: "Shopify Order Fulfilled", category: "Ecommerce", confirmed: false, notes: "Deprecating per GHL help center." },
  { type: "facebook_lead_gen", uiName: "Facebook Lead Form Submitted", category: "Social", confirmed: false, requiredConditionFields: ["facebook.formId"] },
  { type: "tik_tok_form_submitted", uiName: "TikTok Form Submitted", category: "Social", confirmed: false, requiredConditionFields: ["tiktok.formId"] },
  { type: "facebook_comment_on_post", uiName: "Facebook Comment(s) On A Post", category: "Social", confirmed: false },
  { type: "ig_comment_on_post", uiName: "Instagram Comment(s) On A Post", category: "Social", confirmed: false },
  { type: "membership_contact_created", uiName: "Membership New Signup", category: "Courses", confirmed: false },
  { type: "category_started", uiName: "Category Started", category: "Courses", confirmed: false },
  { type: "category_completed", uiName: "Category Completed", category: "Courses", confirmed: false },
  { type: "lesson_started", uiName: "Lesson Started", category: "Courses", confirmed: false },
  { type: "lesson_completed", uiName: "Lesson Completed", category: "Courses", confirmed: false },
  { type: "offer_access_granted", uiName: "Offer Access Granted", category: "Courses", confirmed: false },
  { type: "offer_access_removed", uiName: "Offer Access Removed", category: "Courses", confirmed: false },
  { type: "product_access_granted", uiName: "Product Access Granted", category: "Courses", confirmed: false },
  { type: "product_access_removed", uiName: "Product Access Removed", category: "Courses", confirmed: false },
  { type: "product_started", uiName: "Product Started", category: "Courses", confirmed: false },
  { type: "product_completed", uiName: "Product Completed", category: "Courses", confirmed: false },
  { type: "user_log_in", uiName: "User Login", category: "Courses", confirmed: false },
  { type: "note_add", uiName: "Note Added", category: "Task & Note", confirmed: false },
  { type: "note_changed", uiName: "Note Changed", category: "Task & Note", confirmed: false },
  { type: "task_added", uiName: "Task Added", category: "Task & Note", confirmed: false },
  { type: "task_due_date_reminder", uiName: "Task Reminder", category: "Task & Note", confirmed: false },
  { type: "manual_trigger", uiName: "Manual Trigger", category: "Other", confirmed: false },
  { type: "inbound_webhook", uiName: "Inbound Webhook", category: "Other", confirmed: false },
  { type: "custom_date_reminder", uiName: "Custom Date Reminder", category: "Other", confirmed: false },
  { type: "scheduler_trigger", uiName: "Scheduler", category: "Other", confirmed: false, notes: "Configure via schedule_config: {frequency, time, timezone, daysOfWeek, ...}." },
  { type: "validation_error", uiName: "Number Validation", category: "Other", confirmed: false },
  { type: "affiliate_created", uiName: "Affiliate Created", category: "Affiliate", confirmed: false },
  { type: "ivr_incoming_call", uiName: "Start IVR Trigger", category: "IVR", confirmed: false, requiredConditionFields: ["inbound_number"] },
  { type: "custom_object_created", uiName: "Custom Object Created", category: "Other", confirmed: false },
  { type: "custom_object_changed", uiName: "Custom Object Changed", category: "Other", confirmed: false },
  { type: "conv_ai_trigger", uiName: "Conversation AI", category: "Other", confirmed: false },
  { type: "conv_ai_autonomous_trigger", uiName: "Conversation AI Autonomous", category: "Other", confirmed: false },

  // --- Additional types from the broader GHL help-center catalog, not covered by the JS-bundle extraction above ---
  { type: "opportunity_monetary_value_changed", uiName: "Opportunity Value Changed", category: "Opportunities", confirmed: false },
  { type: "affiliate_sale", uiName: "New Affiliate Sales", category: "Affiliate", confirmed: false },
  { type: "affiliate_enrolled", uiName: "Affiliate Enrolled In Campaign", category: "Affiliate", confirmed: false },
  { type: "affiliate_lead_created", uiName: "Lead Created (Affiliate)", category: "Affiliate", confirmed: false },
  { type: "order_fulfilled", uiName: "Order Fulfilled", category: "Ecommerce", confirmed: false },
  { type: "product_review_submitted", uiName: "Product Review Submitted", category: "Ecommerce", confirmed: false },
  { type: "abandoned_checkout", uiName: "Abandoned Checkout", category: "Ecommerce", confirmed: false },
  { type: "coupon_code_applied", uiName: "Coupon Code Applied", category: "Payments", confirmed: false },
  { type: "coupon_limit_reached", uiName: "Coupon Redemption Limit Reached", category: "Payments", confirmed: false },
  { type: "coupon_code_expired", uiName: "Coupon Code Expired", category: "Payments", confirmed: false },
  { type: "coupon_code_redeemed", uiName: "Coupon Code Redeemed", category: "Payments", confirmed: false },
  { type: "estimates", uiName: "Estimates", category: "Payments", confirmed: false },
  { type: "certificate_issued", uiName: "Certificates Issued", category: "Other", confirmed: false },
  { type: "transcript_generated", uiName: "Transcript Generated", category: "Other", confirmed: false },
  { type: "google_lead_form", uiName: "Google Lead Form Submitted", category: "Other", confirmed: false },
  { type: "linkedin_lead_form", uiName: "LinkedIn Lead Form Submitted", category: "Other", confirmed: false },
  { type: "external_tracking_event", uiName: "External Tracking Event", category: "Other", confirmed: false },
  { type: "page_view", uiName: "Funnel/Website PageView", category: "Other", confirmed: false },
  { type: "quiz_submitted", uiName: "Quiz Submitted", category: "Other", confirmed: false },
  { type: "review_received", uiName: "New Review Received", category: "Other", confirmed: false },
  { type: "prospect_generated", uiName: "Prospect Generated", category: "Other", confirmed: false },
  { type: "click_to_whatsapp", uiName: "Click To WhatsApp Ads", category: "Other", confirmed: false },
  { type: "contact_engagement_score", uiName: "Contact Engagement Score", category: "Contact", confirmed: false },
  { type: "custom_trigger", uiName: "Custom Trigger", category: "Other", confirmed: false },
];

export const TRIGGER_TYPE_MAP: ReadonlyMap<string, TriggerTypeInfo> = new Map(TRIGGER_TYPES.map((t) => [t.type, t]));

/** Looks up registry metadata for a trigger type string. No auto-correction (see file header) -- just informational. */
export function lookupTriggerType(type: string): TriggerTypeInfo | undefined {
  return TRIGGER_TYPE_MAP.get(type);
}
