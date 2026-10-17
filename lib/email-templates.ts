/**
 * Canonical campaign email templates.
 *
 * These are pure strings (safe to import from client components) and are the
 * single source of truth used by:
 *   - the admin panel ("Load template" buttons + preview)
 *   - the API route that auto-creates the community template
 *   - the activation drip runner (lib/activation-emails.ts), which seeds the
 *     Day 0 / 1 / 3 / 7 templates into the database on first run so they show
 *     up in the admin panel and can be edited like any other template.
 *
 * All bodies contain ONLY the inner content and open with the dark-theme marker
 * (see lib/email-shell.ts) so they render on the premium dark background. The
 * responsive shell owns the page background, the card and the footer, so
 * everything stays mobile-first and visually consistent.
 */

export type EmailTemplateSeed = {
  name: string
  category: 'onboarding' | 'engagement' | 'reengagement' | 'exam_prep' | 'general'
  subject: string
  body: string
}

import { DARK_THEME_MARKER } from '@/lib/email-shell'

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif"

/** Dark palette shared by every template (kept in sync with lib/email-shell.ts). */
const C = {
  text: '#cbd5e1',
  textSoft: '#94a3b8',
  heading: '#f8fafc',
  accent: '#34d399',
  cardBg: '#131c30',
  cardBorder: '#21304d',
  iconBg: '#0e2a22',
  iconBorder: '#1c5b48',
  tipBg: '#0b2a1e',
  tipText: '#a7f3d0',
  muted: '#94a3b8',
}

/** Prefixes a body with the dark-theme marker so the shell renders it dark. */
const dark = (html: string) => `${DARK_THEME_MARKER}\n${html}`

const cta = (href: string, label: string, note?: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
  <tr>
    <td align="center" style="padding:0;">
      <a class="pj-btn" href="${href}" target="_blank" style="display:inline-block;background:#059669;color:#ffffff;font-family:${FONT};font-size:16px;font-weight:700;line-height:1;text-decoration:none;padding:16px 34px;border-radius:12px;box-shadow:0 10px 20px -8px rgba(5,150,105,0.6);">${label}</a>
    </td>
  </tr>
</table>${note ? `\n<p class="pj-center-mobile" style="margin:0;text-align:center;font-size:12.5px;color:${C.muted};">${note}</p>` : ''}`

const hero = (emoji: string, headline: string, sub: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td class="pj-hero" style="background:linear-gradient(135deg,#047857 0%,#059669 55%,#10b981 100%);border-radius:16px;padding:32px 26px;text-align:center;">
      <div style="font-size:32px;line-height:1;margin-bottom:12px;">${emoji}</div>
      <h1 class="pj-h1" style="margin:0 0 10px;font-family:${FONT};font-size:26px;line-height:1.28;font-weight:800;letter-spacing:-0.02em;color:#ffffff;">${headline}</h1>
      <p class="pj-lead" style="margin:0;font-family:${FONT};font-size:15px;line-height:1.55;font-weight:500;color:#ecfdf5;">${sub}</p>
    </td>
  </tr>
</table>`

const featureCard = (icon: string, title: string, text: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;">
  <tr>
    <td style="background:${C.cardBg};border:1px solid ${C.cardBorder};border-radius:14px;padding:15px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td class="pj-stack" width="44" valign="top" style="width:44px;padding-right:14px;">
            <div class="pj-stack-icon" style="width:40px;height:40px;line-height:40px;text-align:center;background:${C.iconBg};border:1px solid ${C.iconBorder};border-radius:11px;font-size:19px;">${icon}</div>
          </td>
          <td class="pj-center-mobile" valign="top">
            <div style="font-family:${FONT};font-size:15px;font-weight:700;color:${C.heading};margin-bottom:3px;">${title}</div>
            <div style="font-family:${FONT};font-size:13.5px;line-height:1.5;color:${C.textSoft};">${text}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`

const tip = (text: string) => `
<div style="background:${C.tipBg};border-left:4px solid #10b981;border-radius:0 10px 10px 0;padding:14px 16px;margin:22px 0 4px;">
  <p style="margin:0;font-family:${FONT};font-size:13.5px;line-height:1.55;color:${C.tipText};">${text}</p>
</div>`

const panel = (heading: string, text: string) => `
<div style="background:${C.cardBg};border:1px solid ${C.cardBorder};border-radius:14px;padding:18px;margin:24px 0 4px;">
  <p style="margin:0 0 10px;font-family:${FONT};font-size:13.5px;font-weight:800;color:${C.heading};">${heading}</p>
  <p style="margin:0;font-family:${FONT};font-size:13.5px;line-height:1.6;color:${C.textSoft};">
    ${text}
  </p>
</div>`

/** Replaces {{token}} placeholders (e.g. {{streak}}, {{name}}). Unknown tokens become ''. */
export function applyTemplateTokens(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => (key in vars ? vars[key] : ''))
}

// ---------------------------------------------------------------------------
// Community launch announcement (mobile-first, dark)
// ---------------------------------------------------------------------------

export const COMMUNITY_ANNOUNCEMENT_TEMPLATE: EmailTemplateSeed = {
  name: 'Preptio Community Announcement',
  category: 'general',
  subject: 'Introducing Preptio Community: Discuss, Ask & Learn Together! 🚀',
  body: dark(`${hero(
    '🚀',
    'Welcome to Preptio Community!',
    'Ask questions, share notes and prepare smarter together with CA students across Pakistan.'
  )}
<p class="pj-body" style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.text};">Hello Preptio Scholar 👋</p>
<p class="pj-body" style="margin:0 0 20px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.textSoft};">
  We are thrilled to launch the brand new <strong style="color:${C.accent};">Preptio Student Community</strong> — your central space to solve tricky exam questions, clear doubts and learn from peers and mentors.
</p>
<p class="pj-h2" style="margin:0 0 12px;font-family:${FONT};font-size:16px;font-weight:800;color:${C.heading};">✨ What you can do today</p>
${featureCard('💬', 'Ask Questions & Mark Solved', 'Post difficult concepts and upvote the verified correct answer.')}
${featureCard('🎭', 'Anonymous Posting', 'Prefer privacy? Toggle anonymous mode anytime and ask with peace of mind.')}
${featureCard('📸', 'Upload Diagrams & Worksheets', 'Snap financial statements or past papers and drop them straight into a thread.')}
${featureCard('🏷️', 'Organised by Subject', 'Filter discussions by Accounting, Law, Tax, Audit and more.')}
${cta('https://preptio.com/community', 'Explore Community Now →', 'Jump into a discussion and start participating today.')}
${tip('💡 <strong>Pro tip:</strong> Bookmark helpful threads to revisit later, and follow topics to get notified when answers are posted.')}`),
}

// ---------------------------------------------------------------------------
// Streak-at-risk reminder (email fallback for users without push enabled)
// ---------------------------------------------------------------------------

export const STREAK_AT_RISK_TEMPLATE: EmailTemplateSeed = {
  name: 'Streak At Risk Reminder',
  category: 'reengagement',
  subject: '🔥 Your {{streak}}-day streak is about to break!',
  body: dark(`${hero(
    '🔥',
    'Keep your {{streak}}-day streak alive, {{name}}!',
    'You practised yesterday — today is the last day to keep the streak going.'
  )}
<p class="pj-body" style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.text};">Hi {{name}},</p>
<p class="pj-body" style="margin:0 0 20px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.textSoft};">
  We noticed you haven’t practised yet today. Your <strong style="color:${C.accent};">{{streak}}-day streak</strong> will reset at midnight — but a few quick questions right now is all it takes to keep it alive.
</p>
${featureCard('⏱️', 'It only takes 3 minutes', 'A short practice session is enough to keep your streak going.')}
${featureCard('📈', 'Consistency beats cramming', 'Small daily sessions are the single biggest driver of exam success.')}
${cta('https://preptio.com/practice', 'Practise Now & Save My Streak →', 'A few questions before midnight keeps your streak alive')}
${tip('💡 <strong>Tip:</strong> Your streak is a habit worth protecting. Even 5 questions counts.')}`),
}

// ---------------------------------------------------------------------------
// Activation drip — for users who signed up but never practised
// ---------------------------------------------------------------------------

export const ACTIVATION_DAY_0: EmailTemplateSeed = {
  name: 'Activation — Day 0 (Never Practised)',
  category: 'onboarding',
  subject: 'Your CA prep starts with just 5 questions 📝',
  body: dark(`${hero(
    '🎯',
    'Your CA prep starts with 5 questions',
    'You are all set up but haven’t attempted a practice yet. Your first one takes about 3 minutes.'
  )}
<p class="pj-body" style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.text};">Hi there,</p>
<p class="pj-body" style="margin:0 0 20px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.textSoft};">
  Welcome to Preptio! The students who improve fastest all start the same way — with one short practice session. Here is how easy it is to begin:
</p>
${featureCard('1️⃣', 'Pick any subject', 'Choose a chapter you are studying right now — no pressure to finish it.')}
${featureCard('2️⃣', 'Answer 5 questions', 'A quick 3-minute set gives you an instant accuracy snapshot.')}
${featureCard('3️⃣', 'See your score instantly', 'Preptio shows exactly where you stand and what to revise next.')}
${cta('https://preptio.com/practice', 'Start My First Practice →', 'Takes about 3 minutes · No download needed')}
${panel('🔥 Build a streak from day one', 'Practise a little every day and watch your streak grow. Consistency is the single biggest predictor of exam success — and it starts with today.')}
${tip('💡 <strong>Tip:</strong> Set a daily goal in your dashboard and Preptio will nudge you to keep it.')}`),
}

export const ACTIVATION_DAY_1: EmailTemplateSeed = {
  name: 'Activation — Day 1 (Never Practised)',
  category: 'onboarding',
  subject: 'A 3-minute practice is all it takes today ⏱️',
  body: dark(`${hero(
    '⏱️',
    'Still thinking about starting?',
    'The hardest part is the first question. After that it’s easy — and it only takes 3 minutes.'
  )}
<p class="pj-body" style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.text};">Hi there,</p>
<p class="pj-body" style="margin:0 0 20px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.textSoft};">
  You created your Preptio account but haven’t attempted a practice yet. Here is why today is the perfect day to change that:
</p>
${featureCard('📊', 'Know exactly where you stand', 'One short test shows your strengths and the topics that need work.')}
${featureCard('🧠', 'Revise smarter', 'Preptio turns your results into a personalised revision list.')}
${featureCard('📈', 'Track real progress', 'Every attempt is recorded so you can see yourself improving week by week.')}
${cta('https://preptio.com/practice', 'Attempt 5 Questions Now →', 'Your first practice takes about 3 minutes')}
${tip('💡 <strong>Tip:</strong> Start with a subject you already feel confident in — a quick win builds momentum.')}`),
}

export const ACTIVATION_DAY_3: EmailTemplateSeed = {
  name: 'Activation — Day 3 (Never Practised)',
  category: 'engagement',
  subject: 'Your first mock test is waiting for you 📋',
  body: dark(`${hero(
    '📋',
    'Ready for your first mock test?',
    'Students who practise early score significantly higher. Take the leap today.'
  )}
<p class="pj-body" style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.text};">Hi there,</p>
<p class="pj-body" style="margin:0 0 20px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.textSoft};">
  Your account has been ready for a few days — let’s put it to work. A single practice session today will unlock your personalised analytics and study plan.
</p>
${featureCard('🎯', 'Targeted practice', 'Focus on one chapter and get instant explanations for every question.')}
${featureCard('🗓️', 'Full mock tests', 'Simulate real exam conditions when you feel ready.')}
${featureCard('🔁', 'Spaced repetition', 'Preptio resurfaces weak questions at the right time so they stick.')}
${cta('https://preptio.com/practice', 'Take My First Practice →', 'Choose a subject and begin in seconds')}
${tip('💡 <strong>Tip:</strong> Even 10 questions a day compounds into a huge advantage by exam time.')}`),
}

export const ACTIVATION_DAY_7: EmailTemplateSeed = {
  name: 'Activation — Day 7 (Never Practised)',
  category: 'reengagement',
  subject: 'Let’s make this the week you begin 👟',
  body: dark(`${hero(
    '👟',
    'This is the week you begin',
    'A week in, nothing has changed yet — but one practice today changes everything.'
  )}
<p class="pj-body" style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.text};">Hi there,</p>
<p class="pj-body" style="margin:0 0 20px;font-family:${FONT};font-size:15px;line-height:1.65;color:${C.textSoft};">
  You joined Preptio a week ago but haven’t started practising yet. Every top scorer began with a single, small session — and there is no better moment than now.
</p>
${featureCard('🕒', 'Just 3 minutes', 'Five questions is genuinely all it takes to get moving.')}
${featureCard('👀', 'Instant feedback', 'See your accuracy and the exact topics to focus on next.')}
${featureCard('🔥', 'Start a streak', 'Build a daily habit that makes exam day feel routine.')}
${cta('https://preptio.com/practice', 'Begin My First Practice →', 'It only takes 3 minutes')}
${tip('💡 <strong>Tip:</strong> Pick a fixed time each day for practice and treat it like a class you never skip.')}`),
}

/** Ordered Day 0 / 1 / 3 / 7 activation sequence. */
export const ACTIVATION_TEMPLATES: Array<{ step: number; template: EmailTemplateSeed }> = [
  { step: 0, template: ACTIVATION_DAY_0 },
  { step: 1, template: ACTIVATION_DAY_1 },
  { step: 3, template: ACTIVATION_DAY_3 },
  { step: 7, template: ACTIVATION_DAY_7 },
]

export const ACTIVATION_STEPS = ACTIVATION_TEMPLATES.map((entry) => entry.step)

export function getActivationTemplate(step: number): EmailTemplateSeed | null {
  return ACTIVATION_TEMPLATES.find((entry) => entry.step === step)?.template ?? null
}

/**
 * Every built-in template, in the order they should be seeded/synced. Used by
 * the admin "Refresh designs" action to overwrite the database copies with the
 * latest canonical markup (e.g. after a redesign like the dark theme).
 */
export const CANONICAL_TEMPLATES: EmailTemplateSeed[] = [
  COMMUNITY_ANNOUNCEMENT_TEMPLATE,
  ...ACTIVATION_TEMPLATES.map((entry) => entry.template),
  STREAK_AT_RISK_TEMPLATE,
]
