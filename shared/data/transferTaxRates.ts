export interface TransferTaxRate {
  state: string;
  stateName: string;
  ratePercent: number;
  notes: string;
  paidBy: 'buyer' | 'seller' | 'split' | 'varies';
}

export const transferTaxRates: TransferTaxRate[] = [
  { state: 'AL', stateName: 'Alabama', ratePercent: 0.10, notes: 'Deed tax', paidBy: 'seller' },
  { state: 'AK', stateName: 'Alaska', ratePercent: 0, notes: 'No transfer tax', paidBy: 'varies' },
  { state: 'AZ', stateName: 'Arizona', ratePercent: 0, notes: 'No transfer tax', paidBy: 'varies' },
  { state: 'AR', stateName: 'Arkansas', ratePercent: 0.33, notes: 'Real property transfer tax', paidBy: 'seller' },
  { state: 'CA', stateName: 'California', ratePercent: 0.11, notes: 'Documentary transfer tax, varies by county', paidBy: 'varies' },
  { state: 'CO', stateName: 'Colorado', ratePercent: 0.01, notes: 'Documentary fee', paidBy: 'seller' },
  { state: 'CT', stateName: 'Connecticut', ratePercent: 0.75, notes: 'Conveyance tax', paidBy: 'seller' },
  { state: 'DE', stateName: 'Delaware', ratePercent: 2.00, notes: 'Realty transfer tax', paidBy: 'split' },
  { state: 'DC', stateName: 'District of Columbia', ratePercent: 1.10, notes: 'Recordation and transfer tax', paidBy: 'split' },
  { state: 'FL', stateName: 'Florida', ratePercent: 0.70, notes: 'Documentary stamp tax', paidBy: 'seller' },
  { state: 'GA', stateName: 'Georgia', ratePercent: 0.10, notes: 'Transfer tax', paidBy: 'seller' },
  { state: 'HI', stateName: 'Hawaii', ratePercent: 0.10, notes: 'Conveyance tax, graduated rates', paidBy: 'seller' },
  { state: 'ID', stateName: 'Idaho', ratePercent: 0, notes: 'No transfer tax', paidBy: 'varies' },
  { state: 'IL', stateName: 'Illinois', ratePercent: 0.10, notes: 'Transfer tax, varies by county/city', paidBy: 'seller' },
  { state: 'IN', stateName: 'Indiana', ratePercent: 0, notes: 'No transfer tax', paidBy: 'varies' },
  { state: 'IA', stateName: 'Iowa', ratePercent: 0.16, notes: 'Transfer tax', paidBy: 'seller' },
  { state: 'KS', stateName: 'Kansas', ratePercent: 0, notes: 'No transfer tax', paidBy: 'varies' },
  { state: 'KY', stateName: 'Kentucky', ratePercent: 0.10, notes: 'Transfer tax', paidBy: 'seller' },
  { state: 'LA', stateName: 'Louisiana', ratePercent: 0, notes: 'No transfer tax', paidBy: 'varies' },
  { state: 'ME', stateName: 'Maine', ratePercent: 0.44, notes: 'Transfer tax', paidBy: 'split' },
  { state: 'MD', stateName: 'Maryland', ratePercent: 0.50, notes: 'Transfer tax, varies by county', paidBy: 'split' },
  { state: 'MA', stateName: 'Massachusetts', ratePercent: 0.456, notes: 'Deed excise tax', paidBy: 'seller' },
  { state: 'MI', stateName: 'Michigan', ratePercent: 0.75, notes: 'State transfer tax + county tax', paidBy: 'seller' },
  { state: 'MN', stateName: 'Minnesota', ratePercent: 0.33, notes: 'Deed tax', paidBy: 'seller' },
  { state: 'MS', stateName: 'Mississippi', ratePercent: 0, notes: 'No transfer tax', paidBy: 'varies' },
  { state: 'MO', stateName: 'Missouri', ratePercent: 0, notes: 'No transfer tax', paidBy: 'varies' },
  { state: 'MT', stateName: 'Montana', ratePercent: 0, notes: 'No transfer tax', paidBy: 'varies' },
  { state: 'NE', stateName: 'Nebraska', ratePercent: 0.225, notes: 'Documentary stamp tax', paidBy: 'seller' },
  { state: 'NV', stateName: 'Nevada', ratePercent: 0.51, notes: 'Transfer tax', paidBy: 'seller' },
  { state: 'NH', stateName: 'New Hampshire', ratePercent: 1.50, notes: 'Transfer tax', paidBy: 'split' },
  { state: 'NJ', stateName: 'New Jersey', ratePercent: 0.50, notes: 'Realty transfer fee, graduated', paidBy: 'seller' },
  { state: 'NM', stateName: 'New Mexico', ratePercent: 0, notes: 'No transfer tax', paidBy: 'varies' },
  { state: 'NY', stateName: 'New York', ratePercent: 0.40, notes: 'Transfer tax, higher in NYC', paidBy: 'seller' },
  { state: 'NC', stateName: 'North Carolina', ratePercent: 0.20, notes: 'Excise tax', paidBy: 'seller' },
  { state: 'ND', stateName: 'North Dakota', ratePercent: 0, notes: 'No transfer tax', paidBy: 'varies' },
  { state: 'OH', stateName: 'Ohio', ratePercent: 0.10, notes: 'Conveyance fee, varies by county', paidBy: 'seller' },
  { state: 'OK', stateName: 'Oklahoma', ratePercent: 0.15, notes: 'Documentary stamp tax', paidBy: 'seller' },
  { state: 'OR', stateName: 'Oregon', ratePercent: 0, notes: 'No state transfer tax', paidBy: 'varies' },
  { state: 'PA', stateName: 'Pennsylvania', ratePercent: 1.00, notes: 'Realty transfer tax', paidBy: 'split' },
  { state: 'RI', stateName: 'Rhode Island', ratePercent: 0.46, notes: 'Transfer tax', paidBy: 'seller' },
  { state: 'SC', stateName: 'South Carolina', ratePercent: 0.37, notes: 'Deed recording fee', paidBy: 'seller' },
  { state: 'SD', stateName: 'South Dakota', ratePercent: 0.10, notes: 'Transfer tax', paidBy: 'seller' },
  { state: 'TN', stateName: 'Tennessee', ratePercent: 0.37, notes: 'Transfer tax', paidBy: 'seller' },
  { state: 'TX', stateName: 'Texas', ratePercent: 0, notes: 'No transfer tax', paidBy: 'varies' },
  { state: 'UT', stateName: 'Utah', ratePercent: 0, notes: 'No transfer tax', paidBy: 'varies' },
  { state: 'VT', stateName: 'Vermont', ratePercent: 1.25, notes: 'Property transfer tax', paidBy: 'split' },
  { state: 'VA', stateName: 'Virginia', ratePercent: 0.25, notes: 'Recordation tax + grantor tax', paidBy: 'split' },
  { state: 'WA', stateName: 'Washington', ratePercent: 1.28, notes: 'Real estate excise tax', paidBy: 'seller' },
  { state: 'WV', stateName: 'West Virginia', ratePercent: 0.22, notes: 'Excise tax', paidBy: 'seller' },
  { state: 'WI', stateName: 'Wisconsin', ratePercent: 0.30, notes: 'Transfer fee', paidBy: 'seller' },
  { state: 'WY', stateName: 'Wyoming', ratePercent: 0, notes: 'No transfer tax', paidBy: 'varies' },
];

export function getTransferTaxRate(stateCode: string): TransferTaxRate | undefined {
  return transferTaxRates.find(rate => rate.state.toUpperCase() === stateCode.toUpperCase());
}

export function calculateTransferTax(stateCode: string, purchasePrice: number): number {
  const rate = getTransferTaxRate(stateCode);
  if (!rate) return 0;
  return Math.round(purchasePrice * (rate.ratePercent / 100));
}
