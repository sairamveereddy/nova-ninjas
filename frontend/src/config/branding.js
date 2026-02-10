
// ============================================
// JOB NINJAS - CENTRALIZED BRANDING CONFIG
// ============================================
// Update these values to change branding across the entire app

export const BRAND = {
  // Core branding
  name: 'jobNinjas.ai',
  oldName: 'Nova Ninjas', // For reference during migration
  domain: 'jobNinjas.ai',

  // Taglines
  tagline: 'Apply Smarter, Land Faster',
  shortTagline: 'Your Personal Job Ninja',
  heroTagline: 'AI-Powered Resume Tools & Human Job Application Service',

  // Contact
  contactEmail: 'hello@jobNinjas.ai',
  supportEmail: 'support@jobNinjas.ai',

  // Social/Links
  website: 'https://jobNinjas.ai',

  // Logo (update path when new logo is ready)
  logoPath: '/logo.png?v=2',
  logoAlt: 'Job Ninjas Logo',

  // Company info
  year: new Date().getFullYear(),
  copyright: `© ${new Date().getFullYear()} jobNinjas.ai. All rights reserved.`,
};

// ============================================
// PRODUCT TIERS
// ============================================

export const PRODUCTS = {
  AI_NINJA: {
    name: 'AI Ninja',
    path: '/ai-ninja',
    description: 'Self-serve AI-powered job applications',
    tagline: 'Apply smarter, not slower.',
  },
  HUMAN_NINJA: {
    name: 'Human Ninja',
    path: '/human-ninja',
    description: 'Done-for-you application service',
    tagline: 'No time to apply? Let a human Ninja run your search.',
  },
};

// ============================================
// PRICING CONFIGURATION
// ============================================

export const PRICING = {
  // ============================================
  // AI NINJA PLANS
  // ============================================
  AI_FREE: {
    id: 'ai-free',
    name: 'AI Ninja – Free',
    price: 0,
    priceDisplay: 'Free',
    period: '',
    applications: 10,
    isBeta: true,
    description: 'Try jobNinjas.ai for free with essential tools.',
    features: [
      'Access to all Free Tools',
      'AI Resume Scanner',
      '10 Job Applications per day',
      '5 Auto Fills per day',
      'Store 1 base resume',
      '✨ Use it for free unlimited with your own API key',
    ],
    byokNote: 'Your usage is billed by your provider. Keys are stored encrypted.',
  },
  AI_MONTHLY: {
    id: 'ai-monthly',
    name: 'AI Ninja Monthly',
    price: 5,
    priceDisplay: '$5',
    period: '/month',
    applications: 'Unlimited',
    popular: false,
    description: 'Full access to all tools. 2 weeks free trial.',
    features: [
      'Unlimited AI-powered job applications',
      'Full access to Auto Fill',
      'AI Interview Prep',
      'Tailored resume + cover letter for each job',
      'Job Tracker & Auto Fill Extension',
      '24/7 Job Board Access',
      'Access to all future tools',
      'Store and manage multiple resumes',
      'Priority Email Support',
    ],
  },
  AI_YEARLY: {
    id: 'ai-yearly',
    name: 'AI Ninja Yearly',
    price: 50,
    priceDisplay: '$50',
    originalPrice: 59.99,
    discountPercent: 20,
    period: '/year',
    applications: 'Unlimited',
    popular: true,
    description: 'Full access to all tools. 2 weeks free trial.',
    features: [
      'Unlimited AI-powered job applications',
      'Full access to Auto Fill',
      'AI Interview Prep',
      'Tailored resume + cover letter for each job',
      'Job Tracker & Auto Fill Extension',
      '24/7 Job Board Access',
      'Access to all future tools',
      'Store and manage multiple resumes',
      'Priority Email Support',
    ],
  },

  // ============================================
  // HUMAN NINJA PLANS (Done-for-You)
  // ============================================
  HUMAN_STARTER: {
    id: 'human-starter',
    name: 'Starter Pack',
    price: 50,
    priceDisplay: '$50',
    period: '',
    applications: 50,
    description: 'Our team applies for you using AI + human judgment.',
    features: [
      'We shortlist roles based on your profile',
      'We manually apply to 50 targeted roles for you',
      'We use your AI-tailored documents when possible',
      'All 50 applications logged in your Application Tracker',
    ],
  },
  HUMAN_GROWTH: {
    id: 'human-growth',
    name: 'Growth Pack',
    price: 199,
    priceDisplay: '$199',
    period: '',
    applications: 200,
    description: 'Higher-volume campaign for serious job seekers.',
    features: [
      'We run a higher-volume campaign with 200 targeted applications',
      'We avoid spamming many roles inside the same company',
      'All 200 applications logged in your Application Tracker',
    ],
  },
  HUMAN_SCALE: {
    id: 'human-scale',
    name: 'Scale Pack',
    price: 399,
    priceDisplay: '$399',
    period: '',
    applications: 400,
    description: 'Aggressive outreach while staying targeted.',
    features: [
      'We manage a larger campaign with 400 targeted applications',
      'Ideal if you want aggressive outreach while staying targeted',
      'All 400 applications logged in your Application Tracker',
    ],
  },
  HUMAN_ENTERPRISE: {
    id: 'human-enterprise',
    name: 'Enterprise',
    price: null,
    priceDisplay: 'Contact Us',
    period: '',
    applications: 'Custom',
    description: 'For high-volume or custom requirements.',
    features: [
      'Custom number of applications tailored to your needs',
      'Dedicated account manager',
      'Priority support and faster turnaround',
      'Custom reporting and analytics',
    ],
    isEnterprise: true,
  },

  // Disclaimer for Human Ninja section
  HUMAN_NINJA_DISCLAIMER: 'We do not guarantee a job or visa outcome. We run a serious, structured job search process so you\'re not doing this alone.',
};

// ============================================
// APPLICATION STATUSES
// ============================================

export const APPLICATION_STATUS = {
  APPLIED: 'applied',
  INTERVIEW: 'interview',
  REJECTED: 'rejected',
  OFFER: 'offer',
  ON_HOLD: 'on_hold',
};

export const APPLICATION_STATUS_LABELS = {
  applied: 'Applied',
  interview: 'Interview',
  rejected: 'Rejected',
  offer: 'Offer',
  on_hold: 'On Hold',
};

// ============================================
// VISA TYPES
// ============================================

export const VISA_TYPES = [
  { value: 'opt', label: 'OPT' },
  { value: 'stem-opt', label: 'STEM OPT' },
  { value: 'h1b', label: 'H-1B' },
  { value: 'h4-ead', label: 'H4 EAD' },
  { value: 'l1', label: 'L1' },
  { value: 'gc', label: 'Green Card' },
  { value: 'citizen', label: 'US Citizen' },
  { value: 'pr', label: 'Permanent Resident' },
  { value: 'other', label: 'Other' },
];

// ============================================
// WORK TYPES
// ============================================

export const WORK_TYPES = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

export default BRAND;


