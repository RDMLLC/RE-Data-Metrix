import type { IStorage } from "../storage";
import type { LenderQuestionnaire } from "@shared/schema";

const STATE_CODE_TO_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};

export interface LenderWithQuestionnaire {
  id: string;
  companyName: string;
  email: string;
  contactName: string;
  phone: string | null;
  website: string | null;
  referralLink: string | null;
  referralAmount: string | null;
  referralType: string | null;
  questionnaire: {
    creditScoreMin: number | null;
    loanTypes: string[] | null;
    statesServiced: string[] | null;
    workWithNewInvestors: boolean | null;
    fastestClosingTime: string | null;
    offerNonTraditionalLending: boolean | null;
    offerDeferredPayment: boolean | null;
    offerRolledPoints: boolean | null;
    offer100PercentFunding: boolean | null;
    offerLoansAllStates: string | null;
  } | null;
}

export interface MatchLendersParams {
  loanType: string;
  state: string;
  creditScore: number;
  storage: IStorage;
}

export async function matchLendersByLoanType(params: MatchLendersParams): Promise<LenderWithQuestionnaire[]> {
  const { loanType, state, creditScore, storage } = params;
  
  const stateName = STATE_CODE_TO_NAME[state] || state;
  
  const allLenders = await storage.getAllLenders();
  const allQuestionnaires: LenderQuestionnaire[] = await storage.getAllLenderQuestionnaires();
  
  const questionnairesMap = new Map<string, LenderQuestionnaire>(
    allQuestionnaires.map((q: LenderQuestionnaire) => [q.lenderId, q])
  );
  
  const matchedLenders = allLenders
    .map(lender => {
      const questionnaire = questionnairesMap.get(lender.id);
      return {
        id: lender.id,
        companyName: lender.companyName,
        email: lender.email,
        contactName: lender.contactName,
        phone: lender.phone,
        website: lender.website,
        referralLink: lender.referralLink,
        referralAmount: lender.referralAmount,
        referralType: lender.referralType,
        questionnaire: questionnaire ? {
          creditScoreMin: questionnaire.minCreditScore !== null ? Number(questionnaire.minCreditScore) : null,
          loanTypes: questionnaire.loanTypes,
          statesServiced: questionnaire.statesServiced,
          workWithNewInvestors: questionnaire.workWithNewInvestors,
          fastestClosingTime: questionnaire.fastestClosingTime,
          offerNonTraditionalLending: questionnaire.offerNonTraditionalLending,
          offerDeferredPayment: questionnaire.offerDeferredPayment,
          offerRolledPoints: questionnaire.offerRolledPoints,
          offer100PercentFunding: questionnaire.offer100PercentFunding,
          offerLoansAllStates: questionnaire.offerLoansAllStates,
        } : null
      };
    })
    .filter(lender => {
      if (!lender.questionnaire) return false;
      
      const creditScoreMatch = !lender.questionnaire.creditScoreMin || creditScore >= lender.questionnaire.creditScoreMin;
      
      const loanTypeMatch = !lender.questionnaire.loanTypes ||
                           lender.questionnaire.loanTypes.length === 0 ||
                           lender.questionnaire.loanTypes.includes(loanType);
      
      const stateMatch = lender.questionnaire.offerLoansAllStates === "Yes" ||
                         (lender.questionnaire.statesServiced && lender.questionnaire.statesServiced.includes(stateName));
      
      return creditScoreMatch && loanTypeMatch && stateMatch;
    })
    .sort((a, b) => {
      const aReferral = parseFloat(a.referralAmount || "0");
      const bReferral = parseFloat(b.referralAmount || "0");
      return bReferral - aReferral;
    });
  
  const uniqueCompanyLenders = new Map<string, LenderWithQuestionnaire>();
  for (const lender of matchedLenders) {
    if (!uniqueCompanyLenders.has(lender.companyName)) {
      uniqueCompanyLenders.set(lender.companyName, lender);
      if (uniqueCompanyLenders.size >= 3) break;
    }
  }
  
  return Array.from(uniqueCompanyLenders.values());
}
