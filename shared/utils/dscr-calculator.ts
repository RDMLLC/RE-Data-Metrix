export interface DSCRInputs {
  arv: number;
  monthlyRent: number;
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  interestRate: number;
  loanToValuePercent?: number;
}

export interface DSCRResults {
  loanAmount: number;
  monthlyPrincipalInterest: number;
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  totalMonthlyPITIA: number;
  monthlyRent: number;
  dscr: number;
  dscrStatus: 'poor' | 'caution' | 'good';
  annualInterestRate: number;
}

export function calculateDSCR(inputs: DSCRInputs): DSCRResults {
  const {
    arv,
    monthlyRent,
    monthlyPropertyTax,
    monthlyInsurance,
    monthlyHoa,
    interestRate,
    loanToValuePercent = 80,
  } = inputs;

  const loanAmount = arv * (loanToValuePercent / 100);
  
  const monthlyInterestRate = interestRate / 100 / 12;
  const numberOfPayments = 30 * 12;
  
  const monthlyPrincipalInterest =
    (loanAmount *
      monthlyInterestRate *
      Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
    (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

  const totalMonthlyPITIA =
    monthlyPrincipalInterest +
    monthlyPropertyTax +
    monthlyInsurance +
    monthlyHoa;

  const dscr = monthlyRent / totalMonthlyPITIA;

  let dscrStatus: 'poor' | 'caution' | 'good';
  if (dscr < 1.0) {
    dscrStatus = 'poor';
  } else if (dscr < 1.2) {
    dscrStatus = 'caution';
  } else {
    dscrStatus = 'good';
  }

  return {
    loanAmount,
    monthlyPrincipalInterest,
    monthlyPropertyTax,
    monthlyInsurance,
    monthlyHoa,
    totalMonthlyPITIA,
    monthlyRent,
    dscr,
    dscrStatus,
    annualInterestRate: interestRate,
  };
}
