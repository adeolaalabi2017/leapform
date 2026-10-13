import type { Choice, FieldType, FormSchema, FormTheme } from "./form-types";

export interface TemplateMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  theme: FormTheme;
  schema: FormSchema;
}

const c = (id: string, label: string, i = 0): Choice => ({
  id: `${id}_${i > 0 ? i : "1"}`,
  label,
});
const opts = (base: string, labels: string[]): Choice[] => labels.map((l, i) => c(base + i, l, i + 1));

interface FieldSpec {
  type: FieldType;
  title: string;
  required?: boolean;
  placeholder?: string;
  choices?: string[];
  ratingMax?: number;
  ratingStart?: number;
  min?: number;
  max?: number;
}

interface TemplateSpec {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  background: string;
  font?: "sans" | "serif" | "mono";
  welcome: string;
  completion: string;
  fields: FieldSpec[];
}

function build(spec: TemplateSpec): TemplateMeta {
  const fields = spec.fields.map((f, i) => ({
    id: `fld_${spec.id}_${i + 1}`,
    type: f.type,
    title: f.title,
    required: f.required === true,
    placeholder: f.placeholder,
    properties: f.choices
      ? {
          choices: opts("t", f.choices),
          ...(f.ratingMax ? { ratingMax: f.ratingMax } : {}),
        }
      : f.ratingMax
        ? {
            ratingMax: f.ratingMax,
            ...(f.ratingStart !== undefined ? { ratingStart: f.ratingStart } : {}),
          }
        : f.min !== undefined || f.max !== undefined
          ? { min: f.min, max: f.max }
          : undefined,
  }));
  return {
    id: spec.id,
    name: spec.name,
    category: spec.category,
    description: spec.description,
    icon: spec.icon,
    theme: { color: spec.color, font: spec.font ?? "sans", background: spec.background },
    schema: {
      version: 1,
      title: spec.name,
      welcome: spec.welcome,
      completion: spec.completion,
      fields,
    },
  };
}

const TEMPLATES: TemplateMeta[] = [
  build({
    id: "nps",
    name: "Net Promoter Score® (NPS) survey",
    category: "Loyalty",
    description: "The canonical 0–10 recommendation score, plus reason and improvement capture.",
    icon: "🚀",
    color: "#18442a",
    background: "#f3ede3",
    welcome: "One quick question about your experience — it takes 30 seconds.",
    completion: "Thank you! Your feedback shapes what we build next.",
    fields: [
      { type: "text", title: "How would you describe yourself in one role? (customer, student, patient…)", required: true },
      { type: "rating", title: "How likely are you to recommend us to a friend or colleague?", required: true, ratingMax: 10, ratingStart: 0 },
      { type: "textarea", title: "What's the primary reason for your score?", required: true, placeholder: "The good, the bad, or the ugly…" },
      { type: "textarea", title: "What one thing would make you rate us higher?" },
      { type: "email", title: "Email (optional — if you'd like a follow-up)", placeholder: "name@example.com" },
    ],
  }),
  build({
    id: "user-feedback",
    name: "Product user feedback",
    category: "Product",
    description: "Understand how people actually use your product and what's slowing them down.",
    icon: "💡",
    color: "#18442a",
    background: "#e4dbc4",
    welcome: "Help us make the product better — 3 minutes, anonymous if you want.",
    completion: "Got it. Thanks for helping us build!",
    fields: [
      { type: "dropdown", title: "How long have you been using the product?", required: true, choices: ["Less than a month", "1–6 months", "6–12 months", "1–3 years", "3+ years"] },
      { type: "dropdown", title: "What do you use it for most?", required: true, choices: ["Personal projects", "Team collaboration", "Client work", "Research & analysis", "Other"] },
      { type: "rating", title: "How satisfied are you with the product overall?", required: true, ratingMax: 5 },
      { type: "checkbox", title: "Which capabilities matter most to you?", required: true, choices: ["Speed", "Ease of use", "Integrations", "Design & UX", "Reliability", "Support", "Price"] },
      { type: "textarea", title: "What frustrates you the most today?", required: true },
      { type: "textarea", title: "Is there anything we should build that doesn't exist yet?" },
      { type: "choice", title: "Would you recommend us to a teammate?", choices: ["Definitely", "Probably", "Not sure", "Probably not", "Definitely not"] },
      { type: "email", title: "Email (optional — happy to dig deeper with you)", placeholder: "you@company.com" },
    ],
  }),
  build({
    id: "consumer-feedback",
    name: "Consumer purchase feedback",
    category: "Retail",
    description: "Capture the buying experience after checkout — quality, price and repurchase intent.",
    icon: "🛍️",
    color: "#45644a",
    background: "#f3ede3",
    welcome: "You shopped with us recently — tell us how it went!",
    completion: "Thanks — see you next time!",
    fields: [
      { type: "text", title: "What did you buy?", required: true },
      { type: "dropdown", title: "How did you order?", required: true, choices: ["Online", "In store", "Phone", "Marketplace (Amazon etc.)"] },
      { type: "rating", title: "Product quality", required: true, ratingMax: 5 },
      { type: "rating", title: "Price fairness", required: true, ratingMax: 5 },
      { type: "rating", title: "Delivery / in-store experience", ratingMax: 5 },
      { type: "choice", title: "Would you buy from us again?", required: true, choices: ["Yes, already planned", "Probably", "Hard to say", "Probably not"] },
      { type: "textarea", title: "Anything we could have done better?", required: true },
      { type: "email", title: "Email for a coupon (optional)", placeholder: "Thanks for taking our survey!" },
    ],
  }),
  build({
    id: "csat",
    name: "Customer satisfaction (CSAT) survey",
    category: "Support",
    description: "Measure satisfaction after a support ticket, order or interaction — with follow-up logic.",
    icon: "🤝",
    color: "#18442a",
    background: "#e4dbc4",
    welcome: "How did we do? 60 seconds and we're done.",
    completion: "Thanks for helping us serve you better.",
    fields: [
      { type: "dropdown", title: "Which type of interaction are you rating?", required: true, choices: ["Support ticket", "Phone call", "Live chat", "Delivery/order", "Sales inquiry"] },
      { type: "rating", title: "Overall, how satisfied are you with the result?", required: true, ratingMax: 5 },
      { type: "choice", title: "Was your issue or request fully resolved?", required: true, choices: ["Yes", "Partly", "No"] },
      { type: "textarea", title: "What's still unresolved?", required: false, placeholder: "Tell us what's missing so we can close the loop…" },
      { type: "rating", title: "How easy was it to reach us?", ratingMax: 5 },
      { type: "textarea", title: "Any message for the person who helped you?" },
      { type: "email", title: "Email (optional)", placeholder: "In case we need to follow up" },
    ],
  }),
  build({
    id: "employee-satisfaction",
    name: "Employee satisfaction survey",
    category: "HR",
    description: "Pulse check across compensation, culture, growth — anonymous by default.",
    icon: "🧑‍💼",
    color: "#18442a",
    background: "#f3ede3",
    font: "serif",
    welcome: "An anonymous pulse check. Be honest — this goes straight to HR.",
    completion: "Response recorded. Thank you for taking part.",
    fields: [
      { type: "dropdown", title: "How long have you worked here?", required: true, choices: ["Less than a year", "1–2 years", "3–5 years", "5+ years"] },
      { type: "dropdown", title: "Which team are you on?", required: false, choices: ["Engineering", "Product", "Design", "Sales", "Marketing", "Support", "Operations", "Other"] },
      { type: "rating", title: "My compensation is fair for my role and market.", required: true, ratingMax: 5 },
      { type: "rating", title: "I can keep a healthy work–life balance.", required: true, ratingMax: 5 },
      { type: "rating", title: "I trust the decisions of my direct manager.", required: true, ratingMax: 5 },
      { type: "rating", title: "I see a clear path to grow here.", ratingMax: 5 },
      { type: "choice", title: "Would you recommend this company as a workplace?", choices: ["Yes", "Somewhat", "No"] },
      { type: "textarea", title: "The one thing I would change about my day-to-day work is…", required: true },
      { type: "textarea", title: "Anything you'd like leadership to hear?" },
    ],
  }),
  build({
    id: "event-planning",
    name: "Meeting & event planning survey",
    category: "Events",
    description: "Plan better events — format preferences, topics, logistics and dietary needs.",
    icon: "📅",
    color: "#45644a",
    background: "#e4dbc4",
    welcome: "Help us make the next event worth your time.",
    completion: "Great — see you at the next one!",
    fields: [
      { type: "dropdown", title: "Which format do you prefer?", required: true, choices: ["In person", "Fully remote", "Hybrid", "No preference"] },
      { type: "dropdown", title: "Best day/time for you?", required: true, choices: ["Weekday lunch", "Weekday evenings", "Weekend mornings", "Weekend afternoons"] },
      { type: "checkbox", title: "Topics you'd love to see", required: true, choices: ["Workshops & hands-on", "Panels & debates", "Networking sessions", "Product announcements", "Leadership talks", "Social time"] },
      { type: "rating", title: "How was the venue and logistics last time?", ratingMax: 5 },
      { type: "textarea", title: "What would make you plan two hours around this event?" },
      { type: "choice", title: "Any dietary requirements?", choices: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"] },
      { type: "text", title: "Notes on dietary/allergic needs" },
      { type: "email", title: "Email for the invite list (optional)", placeholder: "We only use it for this event" },
    ],
  }),
  build({
    id: "nonprofit",
    name: "Nonprofit supporter survey",
    category: "Nonprofit",
    description: "Know your donors and volunteers — motivations, communication and future help.",
    icon: "🌱",
    color: "#18442a",
    background: "#f3ede3",
    font: "serif",
    welcome: "Your support moves our mission — tell us how we can do better.",
    completion: "Thank you for being part of this work.",
    fields: [
      { type: "dropdown", title: "How are you involved with us?", required: true, choices: ["Donor", "Volunteer", "Event attendee", "Newsletter reader", "Partner organization", "Other"] },
      { type: "checkbox", title: "What brings you to this cause?", required: true, choices: ["Personal experience", "Community impact", "A friend's ask", "Faith or values", "Wanting to give back", "Professional interest"] },
      { type: "rating", title: "How satisfied are you with our updates and reports?", ratingMax: 5 },
      { type: "choice", title: "Would you like to volunteer or donate again in the next 12 months?", required: true, choices: ["Yes, absolutely", "Maybe — tell me more", "Not this year"] },
      { type: "dropdown", title: "Best way to reach you?", required: true, choices: ["Email", "WhatsApp", "Phone", "Social media", "Post"] },
      { type: "textarea", title: "Is there anything you'd like us to focus on more?" },
      { type: "email", title: "Your email (optional)" },
    ],
  }),
  build({
    id: "school",
    name: "Student, teacher & school survey",
    category: "Education",
    description: "Course and teacher feedback — clarity, workload, what works and what fails.",
    icon: "🎓",
    color: "#18442a",
    background: "#e4dbc4",
    welcome: "Your feedback improves the course for the next cohort.",
    completion: "Thanks for helping us teach better.",
    fields: [
      { type: "dropdown", title: "Who is answering?", required: true, choices: ["Student", "Teacher / staff", "Parent", "Administrator"] },
      { type: "dropdown", title: "Your grade level / role level", required: true, choices: ["Primary", "Secondary", "University", "Adult education"] },
      { type: "rating", title: "The expectations for this class were clear.", required: true, ratingMax: 5 },
      { type: "rating", title: "The teaching method helped me learn.", required: true, ratingMax: 5 },
      { type: "choice", title: "The workload feels…", required: true, choices: ["Too light", "Just right", "Too heavy", "Way too heavy"] },
      { type: "choice", title: "Would you take another course with this teacher?", required: true, choices: ["Yes", "Unsure", "No"] },
      { type: "textarea", title: "What helped your learning the most?" },
      { type: "textarea", title: "One thing the teacher or school could improve:", required: true },
    ],
  }),
  build({
    id: "market-research",
    name: "Market research survey",
    category: "Research",
    description: "Usage, consideration sets, decision drivers and spend — fuel for positioning.",
    icon: "📊",
    color: "#18442a",
    background: "#e4dbc4",
    welcome: "Answer honestly — there are no wrong answers here.",
    completion: "Thanks! Your input feeds real decisions.",
    fields: [
      { type: "dropdown", title: "Age group", required: true, choices: ["Under 18", "18–24", "25–34", "35–44", "45–54", "55–64", "65+"] },
      { type: "dropdown", title: "Category you're being surveyed about", required: true, choices: ["Software", "Food & beverage", "Clothing", "Finance", "Travel", "Other"] },
      { type: "checkbox", title: "Which of these have you purchased in the last 6 months?", required: true, choices: ["None", "One product", "Two products", "Three or more"] },
      { type: "checkbox", title: "What drives your purchase decision most?", required: true, choices: ["Price", "Quality", "Reviews", "Brand", "Convenience", "Sustainability"] },
      { type: "number", title: "Typical monthly spend in this category (€)", required: true, min: 0, max: 10000 },
      { type: "textarea", title: "What's missing from today's offerings?", required: true },
      { type: "email", title: "Email for the raffle (optional)" },
    ],
  }),
  build({
    id: "brand-awareness",
    name: "Brand awareness & building survey",
    category: "Marketing",
    description: "Measure recognition, associations and recall to steer brand investments.",
    icon: "🏗️",
    color: "#45644a",
    background: "#f3ede3",
    welcome: "Quick brand perception check — gut answers welcome.",
    completion: "Thanks for adding your perspective!",
    fields: [
      { type: "dropdown", title: "Before this survey, had you heard of us?", required: true, choices: ["Yes, and I've bought something", "Yes, but never bought", "Seen it somewhere", "First time today"] },
      { type: "dropdown", title: "How did you first hear about us?", required: false, choices: ["Friend or colleague", "Social media", "Search engine", "News / press", "Event", "Ad", "Store", "Other"] },
      { type: "checkbox", title: "Which words fit the brand?", required: true, choices: ["Innovative", "Trustworthy", "Affordable", "Premium", "Friendly", "Boring", "Overpriced", "Reliable"] },
      { type: "rating", title: "How strongly do you trust the brand?", ratingMax: 5 },
      { type: "choice", title: "When you think of this category, which brand comes to mind first?", required: true, choices: ["Us", "Competitor A", "Competitor B", "Don't know the category"] },
      { type: "textarea", title: "If you could change one thing about this brand, what would it be?" },
      { type: "email", title: "Email (optional)" },
    ],
  }),
  build({
    id: "healthcare",
    name: "Healthcare experience survey",
    category: "Healthcare",
    description: "Rate scheduling, wait time and provider communication after a visit.",
    icon: "🩺",
    color: "#18442a",
    background: "#e4dbc4",
    font: "sans",
    welcome: "Please rate your most recent visit. Responses are kept confidential.",
    completion: "Thank you — your feedback improves care.",
    fields: [
      { type: "dropdown", title: "Visit type", required: true, choices: ["Routine check-up", "Urgent care", "Specialist visit", "Lab / imaging", "Telehealth", "Follow-up"] },
      { type: "rating", title: "Ease of scheduling the appointment", required: true, ratingMax: 5 },
      { type: "rating", title: "Wait time before being seen", required: true, ratingMax: 5 },
      { type: "rating", title: "Communication with your provider", required: true, ratingMax: 5 },
      { type: "rating", title: "Facility cleanliness and comfort", ratingMax: 5 },
      { type: "choice", title: "Were your questions and concerns addressed?", required: true, choices: ["Fully", "Partly", "Not really"] },
      { type: "choice", title: "Did you leave with a clear picture of next steps?", choices: ["Yes, very clear", "Mostly", "Somewhat", "Not at all"] },
      { type: "rating", title: "Overall experience", required: true, ratingMax: 5 },
      { type: "textarea", title: "Anything else we should know?" },
      { type: "text", title: "Name or patient ID (optional, for follow-up)" },
    ],
  }),
];

export { TEMPLATES };
