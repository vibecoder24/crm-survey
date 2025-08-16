export type QuestionType = 'text' | 'long_text' | 'multiple_choice' | 'multi_select' | 'rating_group' | 'scale';

export type RatingItem = {
  id: string;
  label: string;
  description?: string;
};

export type Question = {
  id: string;
  type: QuestionType;
  label: string;
  required?: boolean;
  explanation?: string;
  hint?: string;
  options?: { id: string; label: string }[];
  voiceInputEnabled?: boolean; // multiple_choice only
  // scale question support
  scaleMin?: number;
  scaleMax?: number;
};

export type Section = {
  id: string;
  title: string;
  objective: string;
  victoryCopy: string;
  questions: Question[];
};

export type RatingGroupSection = {
  id: string;
  title: string;
  objective: string;
  victoryCopy: string;
  type: 'rating_group';
  scaleMin: number;
  scaleMax: number;
  items: RatingItem[];
};

export type SurveySchema = {
  metadata: {
    id: string;
    title: string;
    version: string;
    sourceLink: string;
  };
  respondentFields: { id: string; label: string; type: 'text' | 'email'; required: boolean }[];
  sections: Array<Section | RatingGroupSection>;
};

export const surveySchema: SurveySchema = {
  metadata: {
    id: 'crm-pain-points-v1',
    title: 'CRM Pain Points Survey',
    version: '0.3.0',
    sourceLink:
      'https://docs.google.com/document/d/1cb1G7e8u_ZiYbQBuAKmYNCsE-RxBOMuc5spMZJ6Sq9U/edit?usp=sharing',
  },
  respondentFields: [
    { id: 'full_name', label: 'Full name', type: 'text', required: true },
    { id: 'email', label: 'Email', type: 'email', required: true },
    { id: 'company_name', label: 'Company (optional)', type: 'text', required: false },
  ],
  sections: [
    {
      id: 'about_you',
      title: 'About You',
      objective: 'Capture your role and context to interpret responses correctly.',
      victoryCopy: 'Great context—this helps us tailor insights.',
      questions: [
        { id: 'nps', type: 'scale', label: 'How happy are you with your current CRM?', scaleMin: 0, scaleMax: 10, required: true },
        {
          id: 'current_crm',
          type: 'multiple_choice',
          label: 'Which CRM are you using?',
          options: [
            { id: 'sf', label: 'Salesforce' },
            { id: 'hs', label: 'HubSpot' },
            { id: 'pd', label: 'Pipedrive' },
            { id: 'zoho', label: 'Zoho' },
            { id: 'monday', label: 'monday.com' },
            { id: 'fresh', label: 'Freshsales' },
            { id: 'other', label: 'Other (specify)' },
          ],
          required: true,
        },
        {
          id: 'primary_role',
          type: 'multiple_choice',
          label: 'Your primary role (pick one)',
          options: [
            { id: 'sales_bd', label: 'Sales / Business Development' },
            { id: 'sales_ops', label: 'Sales Ops / RevOps' },
            { id: 'marketing', label: 'Marketing' },
            { id: 'founder_clevel', label: 'Founder / C-Level' },
            { id: 'customer_success', label: 'Customer Success / Account Management' },
            { id: 'other', label: 'Other (specify)' },
          ],
          required: true,
          explanation: 'Choose the role that fits you best. If “Other,” provide details inline.',
        },
        {
          id: 'seniority',
          type: 'multiple_choice',
          label: 'Seniority / decision influence',
          options: [
            { id: 'daily_user', label: 'Daily user, no purchase influence' },
            { id: 'team_lead', label: 'Team lead, influences tool selection' },
            { id: 'dept_head', label: 'Department head, approves budgets' },
            { id: 'executive', label: 'Executive, final decision maker' },
          ],
          required: true,
        },
        {
          id: 'licenses_count',
          type: 'multiple_choice',
          label: 'Number of CRM licenses',
          options: [
            { id: '1_5', label: '1–5' },
            { id: '6_25', label: '6–25' },
            { id: '26_100', label: '26–100' },
            { id: '100_plus', label: '100+' },
          ],
          required: true,
        },
        { id: 'active_users', type: 'text', label: 'Number of active users', explanation: 'Enter a number.', required: true },
      ],
    },
    {
      id: 'daily_routine',
      title: 'Your Daily HubSpot Routine',
      objective: 'Understand time spent, key metrics tracked, and first actions each day.',
      victoryCopy: 'Daily rhythm captured—on to what you value most.',
      questions: [
        {
          id: 'time_spent',
          type: 'multiple_choice',
          label: 'Roughly how much time do you spend in CRM each working day?',
          options: [
            { id: 'lt_30', label: '< 30 min' },
            { id: '30_60', label: '30–60 min' },
            { id: '1_2h', label: '1–2 hrs' },
            { id: 'gt_2h', label: '2+ hrs' },
          ],
          required: true,
        },
        { id: 'top_metrics', type: 'long_text', label: 'What are the top metrics you track daily in CRM? (list your top 3)', explanation: 'e.g., Total pipeline value; Total deals; Status of companies', required: true },
        {
          id: 'start_of_day',
          type: 'long_text',
          label: 'Describe a typical “start-of-day” workflow in CRM',
          explanation: 'What tabs, lists, or reports do you check first?',
          hint: 'Sample: I open the Deals board to review stuck deals, check the “New leads” list, scan yesterday’s emails on Contact timelines, and glance at the “Meetings this week” dashboard.',
          required: true,
        },
      ],
    },
    {
      id: 'features_value',
      title: 'Features You Value (CRM Today)',
      objective: 'Rate how valuable each feature is to you today (1 = Not valuable, 5 = Mission-critical).',
      victoryCopy: 'Thanks—clear signal on what matters right now.',
      type: 'rating_group',
      scaleMin: 1,
      scaleMax: 5,
      items: [
        { id: 'deal_pipeline', label: 'Deal pipeline board', description: 'Kanban-style view of deals across stages.' },
        { id: 'contact_timeline', label: 'Contact timeline (emails, calls)', description: 'Chronological activity stream per contact.' },
        { id: 'auto_email_logging', label: 'Automatic email logging', description: 'Auto-captures sent/received emails to the right records.' },
        { id: 'sequences', label: 'Sequence / cadence emails', description: 'Automated multi-step outreach for follow-ups.' },
        { id: 'tasks_reminders', label: 'Tasks & reminders', description: 'Create and schedule to-dos for yourself or team.' },
        { id: 'reporting_dashboards', label: 'Reporting dashboards', description: 'Visualize KPIs and trends in configurable widgets.' },
        { id: 'workflow_automation', label: 'Workflow automation', description: 'If-this-then-that rules to auto-assign, update, or notify.' },
        { id: 'meeting_scheduler', label: 'Meeting scheduler', description: 'Share availability links and auto-create events/records.' },
        { id: 'calling', label: 'Calling / call recording', description: 'Place calls from CRM and record with consent.' },
        { id: 'mobile_app', label: 'Mobile app', description: 'Use CRM features on the go.' },
      ],
    },
    {
      id: 'feature_cannot_lose',
      title: 'Critical feature',
      objective: 'Identify the one feature that must not regress.',
      victoryCopy: 'Noted—the non-negotiable is clear.',
      questions: [
        {
          id: 'hate_to_lose',
          type: 'long_text',
          label: 'Which single CRM feature would you hate to lose? Why?',
        },
      ],
    },
    {
      id: 'pain_points_manual',
      title: 'Pain Points & Manual Work',
      objective: 'Find repetitive, time-consuming tasks that still happen outside CRM.',
      victoryCopy: 'Got it—the friction is mapped.',
      questions: [
        {
          id: 'manual_tasks',
          type: 'multi_select',
          label: 'What tasks inside CRM feel repetitive or time-consuming enough that you still do them manually? (check all that apply)',
          options: [
            { id: 'contact_research', label: 'Contact/Lead research' },
            { id: 'ice_breakers', label: 'Writing personalized ice-breaker emails' },
            { id: 'logging_calls', label: 'Logging calls or meeting notes' },
            { id: 'updating_deals', label: 'Updating deal stages / close dates' },
            { id: 'building_reports', label: 'Building or editing reports' },
            { id: 'importing_data', label: 'Importing data from LinkedIn or other tools' },
            { id: 'pre_meeting', label: 'Preparing pre-meeting summaries' },
            { id: 'email_summaries', label: 'Adding email summaries in CRM' },
            { id: 'data_quality', label: 'Maintaining data quality' },
            { id: 'campaign_integration', label: 'Integrating campaign data to leads/contacts' },
            { id: 'other', label: 'Other (specify)' },
          ],
          required: true,
        },
        {
          id: 'recent_scenario',
          type: 'long_text',
          label: 'Describe one recent scenario where CRM got in your way OR required extra steps.',
          required: true,
        },
      ],
    },
    {
      id: 'integrations_triggers',
      title: 'Integrations & Triggers',
      objective: 'Understand connected tools and where value shows up.',
      victoryCopy: 'Connections mapped—thank you.',
      questions: [
        {
          id: 'connected_tools',
          type: 'multi_select',
          label: 'Current tools already connected to your CRM (check all)',
          options: [
            { id: 'gmail', label: 'Gmail / Google Workspace' },
            { id: 'outlook', label: 'Outlook / Microsoft 365' },
            { id: 'slack', label: 'Slack' },
            { id: 'teams', label: 'Microsoft Teams' },
            { id: 'calendars', label: 'Calendars (Google / Outlook)' },
            { id: 'calling_platform', label: 'Calling platform (e.g., Aircall)' },
            { id: 'marketing_email', label: 'Marketing email provider (SendGrid, Mailgun…)' },
            { id: 'data_enrichment', label: 'Data enrichment (ZoomInfo, Clearbit…)' },
            { id: 'other', label: 'Other (specify)' },
          ],
          required: true,
        },
        { id: 'most_valuable_integration', type: 'long_text', label: 'Which integration do you think is the most valuable', required: true },
        { id: 'crm_love', type: 'long_text', label: 'What do you really love about your CRM? Something that you can’t live without', required: true },
      ],
    },
    {
      id: 'invisible_crm',
      title: 'New “Invisible CRM” Concept',
      objective: 'Indicate your preference for each concept.',
      victoryCopy: 'Great—this tells us where to innovate.',
      questions: [
        { id: 'auto_update', type: 'multiple_choice', label: 'Auto-updating the CRM based on calls, emails', options: [ { id: 'love', label: 'Love it' }, { id: 'might', label: 'Might need it' }, { id: 'dont_need', label: "Don't need" }, { id: 'dont_understand', label: "Don't understand" } ], required: true },
        { id: 'chatgpt_reports', type: 'multiple_choice', label: 'ChatGPT-type conversation to ask for reports, contact history', options: [ { id: 'love', label: 'Love it' }, { id: 'might', label: 'Might need it' }, { id: 'dont_need', label: "Don't need" }, { id: 'dont_understand', label: "Don't understand" } ], required: true },
        { id: 'custom_inbox', type: 'multiple_choice', label: 'Customized information in your inbox based on what you want every day', options: [ { id: 'love', label: 'Love it' }, { id: 'might', label: 'Might need it' }, { id: 'dont_need', label: "Don't need" }, { id: 'dont_understand', label: "Don't understand" } ], required: true },
        { id: 'desktop_research', type: 'multiple_choice', label: 'Desktop research built right into the CRM', options: [ { id: 'love', label: 'Love it' }, { id: 'might', label: 'Might need it' }, { id: 'dont_need', label: "Don't need" }, { id: 'dont_understand', label: "Don't understand" } ], required: true },
        { id: 'ice_breakers_signals', type: 'multiple_choice', label: 'Ice breakers and signals to warm up cold leads', options: [ { id: 'love', label: 'Love it' }, { id: 'might', label: 'Might need it' }, { id: 'dont_need', label: "Don't need" }, { id: 'dont_understand', label: "Don't understand" } ], required: true },
        { id: 'personalized_emails', type: 'multiple_choice', label: 'Personalized emails based on LinkedIn posts and previous conversations', options: [ { id: 'love', label: 'Love it' }, { id: 'might', label: 'Might need it' }, { id: 'dont_need', label: "Don't need" }, { id: 'dont_understand', label: "Don't understand" } ], required: true },
        { id: 'workflows_automation', type: 'multiple_choice', label: 'Workflows to automate your daily repetitive tasks', options: [ { id: 'love', label: 'Love it' }, { id: 'might', label: 'Might need it' }, { id: 'dont_need', label: "Don't need" }, { id: 'dont_understand', label: "Don't understand" } ], required: true },
        { id: 'daily_tasks', type: 'multiple_choice', label: 'Your daily tasks—listed, organized and updated in one place', options: [ { id: 'love', label: 'Love it' }, { id: 'might', label: 'Might need it' }, { id: 'dont_need', label: "Don't need" }, { id: 'dont_understand', label: "Don't understand" } ], required: true }
      ],
    },
    {
      id: 'closing',
      title: 'Closing',
      objective: 'Capture the single biggest frustration and consent for follow-up.',
      victoryCopy: 'Thank you! Your insights will directly shape the next-generation CRM experience.',
      questions: [
        { id: 'magic_wand', type: 'long_text', label: 'If you could wave a magic wand and fix one CRM frustration, what would disappear?' },
        { id: 'followup_consent', type: 'multiple_choice', label: 'May we contact you for a 20-minute follow-up call?', options: [ { id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' } ] },
      ],
    },
  ],
};


