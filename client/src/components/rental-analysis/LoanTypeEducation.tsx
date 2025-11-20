import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ExternalLink } from "lucide-react";

interface LoanType {
  title: string;
  downPayment: string;
  creditScore: string;
  description: string;
  buttonText: string;
  loanTypeFilter: string;
  isExternal?: boolean;
  externalPath?: string;
}

const loanTypes: LoanType[] = [
  {
    title: "Conventional Loans",
    downPayment: "15-25%",
    creditScore: "620-700+",
    description: "Standard fixed-rate or adjustable-rate options for investment properties.",
    buttonText: "Find Conventional Lenders",
    loanTypeFilter: "conventional",
  },
  {
    title: "DSCR (Debt Service Coverage Ratio) Loans",
    downPayment: "20-35%",
    creditScore: "620-680+",
    description: "Qualification based on property cash flow rather than personal income. Overlaps with conventional loans on down payment and credit requirements. Shares property-based underwriting with hard money loans but offers longer terms and lower rates.",
    buttonText: "Find DSCR Lenders",
    loanTypeFilter: "dscr",
  },
  {
    title: "Hard Money / Bridge Loans",
    downPayment: "10-40%",
    creditScore: "Flexible, often no strict minimum (550+ preferred)",
    description: "Short-term, asset-focused loans for fix-and-flip or quick financing. Buy a distressed property with a hard money (bridge) loan, fix it up, refi out of it with a DSCR loan.",
    buttonText: "Find Bridge Lenders",
    loanTypeFilter: "hard_money",
  },
  {
    title: "FHA and VA Loans",
    downPayment: "FHA: 3.5-10% (owner-occupied) | VA: 0% (for veterans)",
    creditScore: "500-620+ depending on loan type",
    description: "Typically require owner occupancy; not standard for pure investment.",
    buttonText: "Find FHA/VA Lenders",
    loanTypeFilter: "fha_va",
  },
  {
    title: "Portfolio and Blanket Loans",
    downPayment: "20-30%",
    creditScore: "Typically 680+",
    description: "Used for multiple properties under one loan.",
    buttonText: "Find Portfolio/Blanket Lenders",
    loanTypeFilter: "portfolio",
  },
  {
    title: "Private and Seller Financing",
    downPayment: "Typically 10-30% (negotiable)",
    creditScore: "Flexible based on agreement",
    description: "Terms negotiable, down payments typically 10-30%. Flexible credit requirements based on agreement.",
    buttonText: "Learn More",
    loanTypeFilter: "",
    isExternal: true,
    externalPath: "/about-private-lenders",
  },
  {
    title: "5/1 ARM Loans (Adjustable-Rate Mortgage)",
    downPayment: "Usually around 5% minimum",
    creditScore: "Typically 620+ required",
    description: "Fixed interest rate for the first 5 years, then annual adjustments. Good for investors planning to hold property ≤5 years to benefit from lower initial rates. Requires ability to handle potential payment increases after adjustment period.",
    buttonText: "Find 5/1 ARM Lenders",
    loanTypeFilter: "arm",
  },
  {
    title: "Balloon Loans",
    downPayment: "Similar to conventional (20%+)",
    creditScore: "Good credit 620+",
    description: "Feature smaller periodic payments with a large lump sum due at loan end (commonly after 5-7 years). Often used when investors plan to refinance or sell before balloon payment is due.",
    buttonText: "Find Balloon Loan Lenders",
    loanTypeFilter: "balloon",
  },
  {
    title: "Interest-Only Loans",
    downPayment: "Often 20% or higher",
    creditScore: "Usually requires solid credit (680+)",
    description: "Borrower pays only interest for the initial period (e.g., 5-10 years), then principal plus interest after. Useful for maximizing cash flow early in ownership with expectation of property appreciation or refinance.",
    buttonText: "Find Interest-Only Lenders",
    loanTypeFilter: "interest_only",
  },
];

interface LoanTypeEducationProps {
  propertyState?: string;
  creditScore?: string;
}

export default function LoanTypeEducation({ propertyState, creditScore }: LoanTypeEducationProps) {
  const buildLenderUrl = (loanType: string) => {
    const params = new URLSearchParams();
    if (propertyState) params.append('state', propertyState);
    if (creditScore) params.append('creditScore', creditScore);
    if (loanType) params.append('loanType', loanType);
    const queryString = params.toString();
    return queryString ? `/lenders?${queryString}` : '/lenders';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Types of Loans for Rental Property Investors
        </h2>
        <p className="text-muted-foreground">
          Here is a comprehensive overview of rental property loan types, including traditional loans and financing structures like 5/1 ARM, balloon loans, and interest-only loans, with typical down payment and credit requirements.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loanTypes.map((loanType, index) => (
          <Card key={index} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">{loanType.title}</CardTitle>
              <CardDescription className="space-y-1">
                <div className="text-xs">
                  <span className="font-medium">Down Payment:</span> {loanType.downPayment}
                </div>
                <div className="text-xs">
                  <span className="font-medium">Credit Score:</span> {loanType.creditScore}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <p className="text-sm text-muted-foreground flex-1">
                {loanType.description}
              </p>
              {loanType.isExternal ? (
                <Link href={loanType.externalPath || "#"}>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    data-testid={`button-loan-${loanType.loanTypeFilter || 'private'}`}
                  >
                    {loanType.buttonText}
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Link href={buildLenderUrl(loanType.loanTypeFilter)}>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    data-testid={`button-loan-${loanType.loanTypeFilter}`}
                  >
                    {loanType.buttonText}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-accent/5 border-accent/20">
        <CardHeader>
          <CardTitle className="text-lg">Overlaps and Considerations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc pl-5 space-y-2">
            <li>DSCR loans overlap most with conventional loans in down payment and credit criteria but differ by focusing on rental income for approval.</li>
            <li>5/1 ARM loans and balloon loans are often structured as conventional loans but offer flexible payment schedules suited to shorter-term investment strategies.</li>
            <li>Interest-only loans can be conventional or specialized loans with cash flow and payment flexibility.</li>
            <li>Hard money loans and DSCR loans share leniency on income documentation but differ markedly in term length and cost.</li>
            <li>Choosing among these depends on investment goals (short vs. long term), credit profile, and tolerance for payment variability.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
