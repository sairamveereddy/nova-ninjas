
// ============================================
// JOB NINJAS - CENTRALIZED BRANDING CONFIG
// ============================================
// Update these values to change branding across the entire app

export const BRAND = {
  // Core branding
  name: 'Job Ninjas',
  oldName: 'Nova Ninjas', // For reference during migration
  domain: 'jobninjas.org',
  
  // Taglines
  tagline: 'Human job squad, supercharged by AI. We apply for you, not bots.',
  shortTagline: 'Your Personal Job Ninja',
  heroTagline: 'Your Ninja. Your Job Search. Your Success.',
  
  // Contact
  contactEmail: 'hello@jobninjas.org',
  supportEmail: 'support@jobninjas.org',
  
  // Social/Links
  website: 'https://jobninjas.org',
  
  // Logo (update path when new logo is ready)
  logoPath: '/logo.png',
  logoAlt: 'Job Ninjas Logo',
  
  // Company info
  year: new Date().getFullYear(),
  copyright: `© ${new Date().getFullYear()} Job Ninjas. All rights reserved.`,
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
    applications: 5,
    description: 'Try Job Ninjas with a few applications before upgrading.',
    features: [
      'Apply to up to 5 jobs using AI Ninja',
      'Upload 1 base resume',
      'Generate tailored resume + cover letter + suggested Q&A for each job',
      'All 5 applications appear in your Application Tracker',
    ],
  },
  AI_PRO: {
    id: 'ai-pro',
    name: 'AI Ninja Pro',
    price: 29.99,
    priceDisplay: '$29.99',
    period: '/month',
    applications: 200,
    description: 'For active job seekers who want high-volume, tailored applications.',
    features: [
      'Apply to up to 200 jobs per month using AI Ninja',
      'Store and manage multiple resumes / profiles',
      'Full access to "Apply with AI Ninja" on internal + external jobs',
      'Tailored resume + cover letter + Q&A for each application',
      'All applications logged in your Application Tracker',
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
    applications: 25,
    description: 'Our team applies for you using AI + human judgment.',
    features: [
      'We shortlist roles based on your profile',
      'We manually apply to 25 targeted roles for you',
      'We use your AI-tailored documents when possible',
      'All 25 applications logged in your Application Tracker',
    ],
  },
  HUMAN_GROWTH: {
    id: 'human-growth',
    name: 'Growth Pack',
    price: 199,
    priceDisplay: '$199',
    period: '',
    applications: 100,
    description: 'Higher-volume campaign for serious job seekers.',
    features: [
      'We run a higher-volume campaign with 100 targeted applications',
      'We avoid spamming many roles inside the same company',
      'All 100 applications logged in your Application Tracker',
    ],
  },
  HUMAN_SCALE: {
    id: 'human-scale',
    name: 'Scale Pack',
    price: 399,
    priceDisplay: '$399',
    period: '',
    applications: 250,
    description: 'Aggressive outreach while staying targeted.',
    features: [
      'We manage a larger campaign with 250 targeted applications',
      'Ideal if you want aggressive outreach while staying targeted',
      'All 250 applications logged in your Application Tracker',
    ],
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


