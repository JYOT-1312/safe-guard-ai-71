export type QuizQuestion = {
  q: string;
  choices: string[];
  answer: number; // index into choices
  explain: string;
};

export type QuizModule = {
  slug: string;
  title: string;
  questions: QuizQuestion[];
};

export const QUIZZES: Record<string, QuizModule> = {
  "upi-safety": {
    slug: "upi-safety",
    title: "UPI Safety",
    questions: [
      {
        q: "A stranger says they will 'refund' ₹500 and sends a UPI Collect Request. What should you do?",
        choices: [
          "Approve it — a refund needs my approval",
          "Enter my UPI PIN to receive the money",
          "Decline it — approving would DEBIT my account",
          "Share my UPI PIN so they can push the refund",
        ],
        answer: 2,
        explain: "UPI Collect = a request to PULL money FROM your account. Approving debits you. Real refunds appear automatically; you never enter your PIN to receive money.",
      },
      {
        q: "When is a UPI PIN required?",
        choices: ["To send money", "To receive money", "Both sending and receiving", "Only for KYC"],
        answer: 0,
        explain: "PIN is required only when money leaves your account. Receiving money never needs your PIN.",
      },
      {
        q: "You get a payment link over WhatsApp from an 'HR' for a job offer. Best move?",
        choices: [
          "Pay the small fee to secure the offer",
          "Never pay for a job — legitimate employers do not charge candidates",
          "Ask them to split the fee in two",
          "Send them your Aadhaar first, then pay",
        ],
        answer: 1,
        explain: "Any request to pay to get a job is a scam. Genuine recruiters never ask for payment.",
      },
    ],
  },
  "atm-card": {
    slug: "atm-card",
    title: "ATM & Debit Card",
    questions: [
      {
        q: "A bank 'officer' calls asking for OTP to 'reverse a fraudulent charge'. You should:",
        choices: ["Share OTP quickly to stop the fraud", "Hang up — banks never ask for OTP", "Give only the last 3 digits", "Share the CVV instead"],
        answer: 1,
        explain: "No real bank employee ever asks for OTP, CVV, or PIN. If asked, it IS the fraud.",
      },
      {
        q: "You lose your debit card. First action?",
        choices: ["Wait 24 hours to be sure", "Post about it on social media", "Block it immediately via app or helpline", "Change your address"],
        answer: 2,
        explain: "Block first, always. Reporting within 3 days limits your liability.",
      },
    ],
  },
  "fake-loan": {
    slug: "fake-loan",
    title: "Fake Loan Apps",
    questions: [
      {
        q: "A loan app demands access to your Contacts and Photos to 'process' a loan. This is:",
        choices: ["Normal KYC", "A predatory / extortion app — uninstall", "Required by RBI", "Fine if the interest rate is low"],
        answer: 1,
        explain: "No legitimate lender needs your contacts or photos. These apps use them for shame-based extortion.",
      },
      {
        q: "Which is a sign of a genuine lender?",
        choices: ["Zero paperwork, instant approval", "Registered as an NBFC or bank with the RBI", "Only listed on Telegram groups", "Threatens family members"],
        answer: 1,
        explain: "Always verify against RBI's list of registered NBFCs and banks.",
      },
    ],
  },
  "phishing": {
    slug: "phishing",
    title: "Phishing & Fake Links",
    questions: [
      {
        q: "Which URL is most likely a phishing site imitating ICICI Bank?",
        choices: ["icicibank.com", "icici-bank.online", "www.icicibank.com", "icicibank.com/personal"],
        answer: 1,
        explain: "Hyphenated look-alike domains on non-standard TLDs (.online, .xyz) are classic typosquats.",
      },
      {
        q: "You get an SMS: 'Your KYC expires today. Update: bit.ly/xxx'. Correct response?",
        choices: [
          "Click quickly before it expires",
          "Ignore — open your bank app directly if you're worried",
          "Reply STOP to unsubscribe",
          "Forward it to friends",
        ],
        answer: 1,
        explain: "Banks never send KYC links over SMS. Always open the official app, never a message link.",
      },
    ],
  },
  "cyber-hygiene": {
    slug: "cyber-hygiene",
    title: "Cyber Hygiene",
    questions: [
      {
        q: "Best password practice for your banking app?",
        choices: ["Same password everywhere — easier to remember", "A unique password + 2FA enabled", "Your birthday", "Written on the back of your card"],
        answer: 1,
        explain: "Unique password + 2FA is the minimum for anything holding your money.",
      },
    ],
  },
  "after-scam": {
    slug: "after-scam",
    title: "If You've Been Scammed",
    questions: [
      {
        q: "You've just been scammed on UPI. Fastest recovery channel in India?",
        choices: ["Post on Twitter", "Call 1930 (National Cyber Helpline) within 24 hours", "Wait for the bank to notice", "File an RTI"],
        answer: 1,
        explain: "1930 + cybercrime.gov.in within the first 24 hours gives the best chance of freezing funds.",
      },
    ],
  },
};

export const MODULE_SLUGS = Object.keys(QUIZZES);
