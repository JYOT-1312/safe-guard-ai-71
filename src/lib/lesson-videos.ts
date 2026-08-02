export type LessonVideo = {
  id: string; // YouTube video id
  title: string;
  source: string; // channel / authority
};

export type LessonTopic = {
  slug: string;
  title: string;
  blurb: string;
  videos: LessonVideo[];
};

/**
 * Every video below is from an official / institutional source
 * (NPCI "UPI Chalega", RBI, public sector banks, CyberDost I4C - Ministry of Home Affairs).
 * Each ID was verified live against the YouTube oEmbed API.
 */
export const LESSON_TOPICS: LessonTopic[] = [
  {
    slug: "upi-safety",
    title: "UPI Safety",
    blurb: "PIN rules, collect-request traps and verifying who you are really paying.",
    videos: [
      { id: "X0-QiPD4kqs", title: "4 UPI Safety Tips To Remember", source: "NPCI · UPI Chalega" },
      { id: "7_ApyC_0zwg", title: "UPI PIN is only for sending money", source: "NPCI · UPI Chalega" },
      { id: "DnL13EPJP1c", title: "Always verify the UPI ID before paying", source: "NPCI · UPI Chalega" },
      { id: "DYQ8b-dANK0", title: "UPI Safety Shield: keep payments secure", source: "NPCI · UPI Chalega" },
      { id: "vBH4nrJtKiI", title: "Cyber awareness on UPI frauds", source: "State Bank of India" },
      { id: "26abRjVYXLY", title: "Is UPI really safe? NPCI's Chief Risk Officer explains", source: "NPCI (interview)" },
    ],
  },
  {
    slug: "atm-debit",
    title: "ATM & Debit",
    blurb: "Skimming, PIN discipline, card blocking and safe ATM habits.",
    videos: [
      { id: "m6WUL6VZ3nU", title: "Beware of ATM scams", source: "Union Bank of India" },
      { id: "87PvTvkdiGQ", title: "ATM scam — stay safe", source: "Indian Bank" },
      { id: "Zf-GyL-U3y4", title: "ATM skimming explained: spot it and stop it", source: "Consumer awareness" },
      { id: "jgvLGRTje8I", title: "Using a RuPay card at the ATM safely", source: "NPCI" },
      { id: "XvyVGRQLcr0", title: "Never share your OTP or click unknown links", source: "State Bank of India" },
      { id: "85sSDtTg7U8", title: "OTP scams — Khabar Nahi, Khabardar Bano", source: "Indian Bank" },
    ],
  },
  {
    slug: "net-banking",
    title: "Net Banking",
    blurb: "Phishing pages, fake KYC, digital arrest calls and safe login habits.",
    videos: [
      { id: "00SIr-Nqut0", title: "RBI Talks: decoding digital frauds", source: "Reserve Bank of India" },
      { id: "p1qbu8gazuo", title: "Phishing scam — stay safe, stay vigilant", source: "Indian Bank" },
      { id: "nJeIGHLiLdA", title: "RBI advisory: staying safe from digital frauds", source: "RBI advisory explainer" },
      { id: "f0nTA_vQSW0", title: "KYC: your first step to safe banking", source: "IDBI Bank · RBI Literacy Week" },
      { id: "u24hKJd0PIs", title: "What to do after a suspicious debit or phishing link", source: "Indian Bank" },
      { id: "Jjir78LDunA", title: "Beware of digital arrest scams", source: "State Bank of India" },
    ],
  },
  {
    slug: "cyber-hygiene",
    title: "Cyber Hygiene",
    blurb: "Reporting on 1930, the golden hour, and everyday device safety.",
    videos: [
      { id: "jMpe2MDAccI", title: "Report a suspicious number, text or link in 3 steps", source: "CyberDost · I4C, MHA" },
      { id: "ajo-a2EwMcc", title: "The 'golden hour' — why reporting fast recovers money", source: "CyberDost · I4C, MHA" },
      { id: "7lUynB-KM0k", title: "Weekly Cyber Samachar: current fraud trends", source: "CyberDost · I4C, MHA" },
      { id: "or8lThywd-8", title: "India steps up its fight against cybercrime", source: "CyberDost · I4C, MHA" },
      { id: "2OggTkXZGno", title: "Cyber Samachar: latest scams to watch for", source: "CyberDost · I4C, MHA" },
      { id: "2vyc3TpxnyE", title: "Banking cyber security awareness (IBA/I4C)", source: "Indian Banks' Association" },
    ],
  },
];
