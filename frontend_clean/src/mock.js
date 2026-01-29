// Mock data for Job Ninjas landing page
import { BRAND } from './config/branding';

export const heroStats = {
  jobsThisWeek: 347,
  totalJobsApplied: 2850,
  hoursSaved: 485,
  successRate: "92%"
};

export const whyDifferent = [
  {
    id: 1,
    title: "Your Dedicated Ninja",
    description: "You get assigned a personal Job Ninja — a real human specialist dedicated to your job search. They know your goals, your strengths, and apply with precision."
  },
  {
    id: 2,
    title: "Ninja Speed + AI Power",
    description: "Your Ninja uses AI to analyze jobs and tailor applications lightning-fast. But every decision and submission is made by your human Ninja — never a bot."
  },
  {
    id: 3,
    title: "Accurate, Not Spammy",
    description: "Ninjas don't spray-and-pray. We focus on strategic, targeted applications that actually get you interviews and protect your professional reputation."
  },
  {
    id: 4,
    title: "Full Transparency",
    description: "Track your Ninja's progress in real-time through your dashboard. See every application, every status update, every win."
  }
];

export const servicesOffered = [
  "Your personal Ninja applies to jobs daily",
  "AI-powered tailoring for speed & accuracy",
  "Real-time Ninja activity dashboard",
  "Weekly progress reports from your Ninja",
  "Interview preparation resources",
  "Direct communication with your dedicated Ninja"
];

export const whyChooseUs = [
  "92% success rate within 3 months",
  "Human specialists, not AI bots",
  "Transparent real-time dashboard",
  "Flexible plans for every budget",
  "Cancel anytime, no lock-in"
];

export const testimonials = [
  {
    id: 1,
    name: "Rahul M.",
    role: "Software Engineer",
    before: "Unemployed for 4 months",
    after: "Senior Developer at Fortune 500",
    quote: "Job Ninjas transformed my job search. I was spending 4 hours daily applying to jobs with no results. Within 6 weeks of using their service, I had 5 interviews and 2 offers.",
    rating: 5
  },
  {
    id: 2,
    name: "Priya K.",
    role: "Product Manager",
    before: "Stuck in underpaying role",
    after: "40% salary increase",
    quote: "The team applied to over 200 relevant positions in my first month. The quality was incredible - every application was tailored. I landed my dream job with a 40% raise.",
    rating: 5
  },
  {
    id: 3,
    name: "Arjun S.",
    role: "Data Analyst",
    before: "H1B visa holder, 60 days to find job",
    after: "Secured role in 5 weeks",
    quote: "With my visa timeline, I couldn't afford to waste time. Job Ninjas understood the urgency and delivered. I'm now working at a company that sponsored my visa.",
    rating: 5
  }
];

export const targetUsers = [
  {
    id: 1,
    title: "Recently laid off in the US",
    description: "You're dealing with unexpected job loss and need to get back on your feet quickly. The thought of applying to hundreds of jobs is overwhelming when you're already stressed."
  },
  {
    id: 2,
    title: "On a visa and racing against time",
    description: "Every day counts when your visa status depends on employment. You can't afford to waste time on the endless grind of job applications while your clock is ticking."
  },
  {
    id: 3,
    title: "Underpaid or stuck in the wrong role",
    description: "You know you deserve better, but finding time to job search while working full-time feels impossible. You're trading precious evenings for resume uploads and cover letters."
  }
];

export const howItWorksSteps = [
  {
    id: 1,
    title: "Tell us your goals",
    description: "Share your resume, LinkedIn, preferred roles, locations, and salary expectations. Your Ninja gets to know exactly what you're looking for."
  },
  {
    id: 2,
    title: "Get assigned your Ninja",
    description: "You're matched with a dedicated Job Ninja — a real human specialist who becomes your personal application warrior. They use AI to find and analyze the best opportunities."
  },
  {
    id: 3,
    title: "Your Ninja applies for you",
    description: "Your Ninja customizes and submits each application with speed and precision. AI helps them tailor faster, but your Ninja personally reviews and submits every one."
  },
  {
    id: 4,
    title: "Track & crush interviews",
    description: "Watch your Ninja's progress in real-time on your dashboard. You focus on skill-building, networking, and crushing those interviews."
  }
];

export const comparisonData = [
  {
    feature: "Humans read & understand job descriptions",
    jobNinjas: true,
    aiBots: false
  },
  {
    feature: "No spammy mass-apply bots",
    jobNinjas: true,
    aiBots: false
  },
  {
    feature: "AI-enhanced tailoring, human decisions",
    jobNinjas: true,
    aiBots: false
  },
  {
    feature: "Real human accountability & support",
    jobNinjas: true,
    aiBots: false
  },
  {
    feature: "Human judgment on every submission",
    jobNinjas: true,
    aiBots: false
  }
];

// Legacy pricing plans removed - use PRICING from branding.js instead
// Current pricing:
// - AI Ninja Free: $0, 5 applications
// - AI Ninja Pro: $29.99/month, 200 applications/month
// - Human Ninja Starter: $50 for 25 applications
// - Human Ninja Growth: $199 for 100 applications  
// - Human Ninja Scale: $399 for 250 applications
export const pricingPlans = [];

export const metricsData = [
  {
    id: 1,
    number: "12,500+",
    label: "Applications submitted for clients"
  },
  {
    id: 2,
    number: "6,200+",
    label: "Estimated hours saved for job seekers"
  },
  {
    id: 3,
    number: "73%",
    label: "Report more interviews within 4-8 weeks"
  }
];

export const faqData = [
  {
    id: 1,
    question: "Do you guarantee a job?",
    answer: "No, we don't guarantee job offers. What we do guarantee is high-volume, high-quality applications that dramatically increase your chances. We handle the repetitive grind so you can focus on interview preparation and skill-building, which are the real keys to landing offers."
  },
  {
    id: 2,
    question: "Who is actually applying to jobs?",
    answer: "Real people on our team - not bots. Our application specialists are trained professionals who understand the nuances of job searching. They read full job descriptions, tailor applications, and ensure every submission reflects your unique value proposition."
  },
  {
    id: 3,
    question: "Will you use my existing resume and LinkedIn?",
    answer: "Yes! We work with your current resume and LinkedIn profile. If you'd like suggestions for improvements, our team can provide feedback, but we always use the materials you're comfortable with. Your personal brand stays authentic."
  },
  {
    id: 4,
    question: "Which countries do you support?",
    answer: "Currently, we focus on US-based job seekers applying to roles in the United States. This allows us to deeply understand the job market, application platforms, and employer expectations in this region."
  },
  {
    id: 5,
    question: "How do you handle my login details and data privacy?",
    answer: "We take privacy seriously. We use secure, encrypted systems to store any credentials. You can also use single sign-on options where available. We never share your data with third parties, and you maintain full control over your accounts at all times."
  },
  {
    id: 6,
    question: "How quickly will I see results?",
    answer: "Most clients start seeing interview requests within 2-4 weeks. The timeline depends on factors like your industry, experience level, and market conditions. What we eliminate immediately is the time-consuming application process, freeing you to focus on interview prep from day one."
  },
  {
    id: 7,
    question: "Can I pause or cancel my subscription?",
    answer: "Absolutely. You can pause your service anytime if you need a break or have interviews scheduled. If you land a job or need to cancel, just let us know. No long-term contracts or hidden fees."
  }
];

export const aboutContent = {
  title: `Why we started ${BRAND.name}`,
  story: `We started ${BRAND.name} because we saw too many talented people stuck in the exhausting cycle of job applications. That's why we created Job Ninjas — dedicated human specialists who become your personal application warriors. Each Ninja uses AI to work faster and smarter, analyzing job descriptions and tailoring your applications with precision. But unlike bots, your Ninja makes every decision and submits every application personally. We never mass-apply or spam recruiters. Your Ninja protects your reputation while maximizing your opportunities. By handling the high-volume application grind, your Ninja frees you to do what actually gets you hired: building relationships and crushing interviews.`
};

// ============================================
// SAMPLE JOB DATA FOR AI NINJA
// ============================================

export const sampleJobs = [
  {
    id: '1',
    title: 'Senior Software Engineer',
    company: 'TechCorp Inc.',
    location: 'San Francisco, CA',
    salaryRange: '$150,000 - $200,000',
    visaTags: ['H-1B', 'STEM OPT'],
    type: 'remote',
    highPay: true,
    sourceUrl: 'https://example.com/job/1',
    categoryTags: ['High-paying', 'Visa sponsorship'],
    description: 'We are looking for a Senior Software Engineer to join our growing team. You will work on cutting-edge technologies and help build scalable systems.',
    fullDescription: `About the Role:
We are seeking a talented Senior Software Engineer to join our engineering team. You will be responsible for designing, developing, and maintaining high-quality software solutions.

Requirements:
- 5+ years of experience in software development
- Proficiency in Python, JavaScript, or similar languages
- Experience with cloud platforms (AWS, GCP, Azure)
- Strong problem-solving skills

Benefits:
- Competitive salary with equity
- Full health, dental, and vision coverage
- Flexible work arrangements
- H-1B visa sponsorship available`,
    postedDate: '2025-12-28'
  },
  {
    id: '2',
    title: 'Product Manager',
    company: 'InnovateTech',
    location: 'New York, NY',
    salaryRange: '$130,000 - $170,000',
    visaTags: ['OPT', 'STEM OPT', 'H-1B'],
    type: 'hybrid',
    highPay: true,
    sourceUrl: 'https://example.com/job/2',
    categoryTags: ['High-paying', 'Visa sponsorship'],
    description: 'Join our product team to drive innovation and lead product development from concept to launch.',
    fullDescription: `About InnovateTech:
We're a fast-growing startup revolutionizing the fintech space. Our Product Manager will own the entire product lifecycle.

What You'll Do:
- Define product vision and roadmap
- Work closely with engineering and design teams
- Conduct user research and gather feedback
- Drive product launches and iterations

What We're Looking For:
- 3+ years of product management experience
- Strong analytical and communication skills
- Experience with agile methodologies
- MBA preferred but not required

We sponsor all visa types!`,
    postedDate: '2025-12-27'
  },
  {
    id: '3',
    title: 'Data Scientist',
    company: 'DataFlow Analytics',
    location: 'Austin, TX',
    salaryRange: '$120,000 - $160,000',
    visaTags: ['STEM OPT', 'H-1B'],
    type: 'remote',
    highPay: true,
    sourceUrl: 'https://example.com/job/3',
    categoryTags: ['High-paying', 'Visa sponsorship', 'Remote'],
    description: 'Build machine learning models and derive insights from complex datasets to drive business decisions.',
    fullDescription: `Role Overview:
As a Data Scientist at DataFlow Analytics, you'll work with large-scale datasets to build predictive models and extract actionable insights.

Responsibilities:
- Develop and deploy ML models
- Analyze complex datasets
- Collaborate with stakeholders to understand business needs
- Present findings to leadership

Requirements:
- MS or PhD in Computer Science, Statistics, or related field
- 2+ years of industry experience
- Proficiency in Python, SQL, and ML frameworks
- Experience with deep learning is a plus

100% remote position with visa sponsorship available.`,
    postedDate: '2025-12-26'
  },
  {
    id: '4',
    title: 'Frontend Developer',
    company: 'WebSolutions Co.',
    location: 'Seattle, WA',
    salaryRange: '$100,000 - $140,000',
    visaTags: ['OPT'],
    type: 'onsite',
    highPay: false,
    sourceUrl: 'https://example.com/job/4',
    categoryTags: ['Visa sponsorship'],
    description: 'Create beautiful, responsive web applications using modern frontend technologies.',
    fullDescription: `About the Position:
WebSolutions Co. is looking for a skilled Frontend Developer to join our creative team.

What You'll Work On:
- Build responsive web applications
- Collaborate with UX designers
- Optimize performance and accessibility
- Contribute to our component library

Tech Stack:
- React, TypeScript
- Next.js, Tailwind CSS
- Testing with Jest and Playwright

We welcome OPT candidates!`,
    postedDate: '2025-12-25'
  },
  {
    id: '5',
    title: 'DevOps Engineer',
    company: 'CloudScale Systems',
    location: 'Denver, CO',
    salaryRange: '$140,000 - $180,000',
    visaTags: ['H-1B', 'Green Card'],
    type: 'remote',
    highPay: true,
    sourceUrl: 'https://example.com/job/5',
    categoryTags: ['High-paying', 'Visa sponsorship', 'Remote'],
    description: 'Design and maintain cloud infrastructure, CI/CD pipelines, and ensure system reliability.',
    fullDescription: `CloudScale Systems is seeking a DevOps Engineer to help us scale our infrastructure.

Key Responsibilities:
- Design and implement CI/CD pipelines
- Manage Kubernetes clusters
- Monitor system performance and reliability
- Automate infrastructure provisioning

Requirements:
- 4+ years of DevOps/SRE experience
- Strong knowledge of AWS or GCP
- Experience with Terraform, Docker, Kubernetes
- Scripting skills (Python, Bash)

Remote work + H-1B and Green Card sponsorship available.`,
    postedDate: '2025-12-24'
  }
];

// AI Ninja FAQ
export const aiNinjaFAQ = [
  {
    id: 1,
    question: "Do you log into company portals and apply for me?",
    answer: "No. AI Ninja generates tailored resumes, cover letters, and suggested answers for each job. You stay in control of your accounts and final submission. If you want fully done-for-you applying, that's what Human Ninja is for."
  },
  {
    id: 2,
    question: "Will this get my resume blacklisted?",
    answer: "Our goal is the opposite. We don't spam dozens of roles in the same company with the same profile. We focus on targeted roles and one smart application per company per month when we operate on your behalf."
  },
  {
    id: 3,
    question: "Can you guarantee me a job or visa?",
    answer: "No. We don't make fake guarantees. We guarantee a serious, structured application process. Your interviews, performance, and the market still matter."
  }
];
