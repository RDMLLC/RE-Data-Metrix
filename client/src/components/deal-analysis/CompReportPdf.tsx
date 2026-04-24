import { usePDF } from "react-to-pdf";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import logoPath from "@assets/Transparent Logo_1762969260481.png";
import { useAuth } from "@/contexts/AuthContext";

interface SoldPropertyComp {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  salePrice: number;
  saleDate: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  pricePerSqft: number;
  yearBuilt?: number;
  distanceFromSubject?: number;
  daysOnMarket?: number;
  isManuallyAdded?: boolean;
  isPending?: boolean;
  lotSize?: number;
  hasPool?: boolean;
  hasGarage?: boolean;
  imageUrl?: string;
}

interface CompReportPdfProps {
  subjectAddress: string;
  subjectCity: string;
  subjectState: string;
  subjectZip: string;
  subjectBeds: number;
  subjectBaths: number;
  subjectSqft: number;
  subjectYearBuilt?: number;
  subjectLotSize?: number;
  subjectLastSoldPrice?: number;
  subjectLastSoldDate?: string;
  subjectHasPool?: boolean;
  subjectHasGarage?: boolean;
  subjectImageUrl?: string;
  suggestedArv: number | null;
  avgPricePerSqft: number | null;
  selectedComps: SoldPropertyComp[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const usMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const month = parseInt(usMatch[1], 10);
    const day = parseInt(usMatch[2], 10);
    const year = parseInt(usMatch[3], 10);
    return `${months[month - 1]} ${day}, ${year}`;
  }
  
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    return `${months[month - 1]} ${day}, ${year}`;
  }
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateString: string): string {
  if (!dateString) return 'N/A';
  
  const usMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    return `${usMatch[1].padStart(2, '0')}/${usMatch[2].padStart(2, '0')}/${usMatch[3]}`;
  }
  
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  }
  
  return dateString;
}

function calculateMonthsSinceSale(dateString: string): number {
  if (!dateString) return 0;
  
  let saleDate: Date;
  const usMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    saleDate = new Date(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2]));
  } else {
    saleDate = new Date(dateString);
  }
  
  const now = new Date();
  const months = (now.getFullYear() - saleDate.getFullYear()) * 12 + (now.getMonth() - saleDate.getMonth());
  return Math.max(0, months);
}

export default function CompReportPdf({
  subjectAddress,
  subjectCity,
  subjectState,
  subjectZip,
  subjectBeds,
  subjectBaths,
  subjectSqft,
  subjectYearBuilt,
  subjectLotSize,
  subjectLastSoldPrice,
  subjectLastSoldDate,
  subjectHasPool,
  subjectHasGarage,
  subjectImageUrl,
  suggestedArv,
  avgPricePerSqft,
  selectedComps,
}: CompReportPdfProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();

  const safeAddress = subjectAddress || 'property';
  const { toPDF, targetRef } = usePDF({
    filename: `comp-report-${safeAddress.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
    page: {
      margin: 15,
      format: 'letter',
      orientation: 'portrait',
    },
    canvas: {
      mimeType: 'image/png',
      qualityRatio: 1,
    },
    overrides: {
      pdf: { compress: true },
    },
  });

  const handleDownload = async () => {
    setIsGenerating(true);
    await toPDF();
    setIsGenerating(false);
  };

  // Calculate stats
  const avgSqft = selectedComps.length > 0 
    ? Math.round(selectedComps.reduce((sum, c) => sum + (c.sqft || 0), 0) / selectedComps.length)
    : 0;
  
  const avgBeds = selectedComps.length > 0
    ? (selectedComps.reduce((sum, c) => sum + (c.bedrooms || 0), 0) / selectedComps.length).toFixed(1)
    : '0';
  
  const avgBaths = selectedComps.length > 0
    ? (selectedComps.reduce((sum, c) => sum + (c.bathrooms || 0), 0) / selectedComps.length).toFixed(1)
    : '0';
  
  const avgYearBuilt = selectedComps.length > 0
    ? Math.round(selectedComps.filter(c => c.yearBuilt).reduce((sum, c) => sum + (c.yearBuilt || 0), 0) / selectedComps.filter(c => c.yearBuilt).length) || 0
    : 0;
  
  const compsWithDistance = selectedComps.filter(c => c.distanceFromSubject !== undefined && c.distanceFromSubject !== null);
  const avgDistance = compsWithDistance.length > 0
    ? (compsWithDistance.reduce((sum, c) => sum + (c.distanceFromSubject || 0), 0) / compsWithDistance.length).toFixed(1)
    : null;
  
  const avgMonthsSinceSale = selectedComps.length > 0
    ? Math.round(selectedComps.reduce((sum, c) => sum + calculateMonthsSinceSale(c.saleDate), 0) / selectedComps.length)
    : 0;

  const avgLotSize = selectedComps.length > 0 && selectedComps.some(c => c.lotSize)
    ? (selectedComps.filter(c => c.lotSize).reduce((sum, c) => sum + (c.lotSize || 0), 0) / selectedComps.filter(c => c.lotSize).length / 43560).toFixed(2)
    : null;

  // Calculate ARV range (±5% of suggested ARV)
  const arvLow = suggestedArv ? Math.round(suggestedArv * 0.95) : null;
  const arvHigh = suggestedArv ? Math.round(suggestedArv * 1.05) : null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleDownload}
        disabled={isGenerating || selectedComps.length === 0}
        data-testid="button-download-comp-report"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {isGenerating ? 'Generating...' : 'Download Comp Report'}
      </Button>

      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
        }}
      >
        <div
          ref={targetRef}
          style={{
            width: '8.5in',
            padding: '0.4in',
            backgroundColor: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#1f2937',
            fontSize: '12px',
            lineHeight: '1.4',
          }}
        >
          {/* Header */}
          {user?.reportLogoUrl ? (
            /* Dual-brand header: user logo left (dominant), RE Data Metrix right */
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={user.reportLogoUrl} alt={user.reportCompanyName || 'Company logo'} style={{ height: '40px', width: 'auto', objectFit: 'contain', maxWidth: '120px' }} />
                {user.reportCompanyName && (
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111' }}>{user.reportCompanyName}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={logoPath} alt="RE Data Metrix" style={{ height: '28px', width: 'auto', opacity: 0.65 }} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#1d4ed8' }}>RE Data Metrix</div>
                  <div style={{ fontSize: '10px', color: '#6b7280', fontStyle: 'italic' }}>Turning Terms into Returns</div>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>www.redatametrix.com</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Deal Analysis Report</div>
                </div>
              </div>
            </div>
          ) : (
            /* Fallback: original simple header (current layout) */
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <img src={logoPath} alt="RE Data Metrix" style={{ height: '36px', width: 'auto' }} />
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1a2e' }}>RE Data Metrix</span>
            </div>
          )}

          {/* Title */}
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
            Comp Report
          </h1>

          {/* Subject Property Card */}
          <div style={{ 
            display: 'flex', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px', 
            marginBottom: '24px',
            overflow: 'hidden',
          }}>
            <div style={{ flex: 1, padding: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
                {subjectAddress}, {subjectCity}, {subjectState} {subjectZip}
              </div>
              {subjectLastSoldPrice && subjectLastSoldDate && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                  Last sold for {formatCurrency(subjectLastSoldPrice)} on {formatShortDate(subjectLastSoldDate)}
                </div>
              )}
              <div style={{ fontSize: '14px', color: '#059669', fontWeight: '600', marginBottom: '8px' }}>
                Estimated ARV {arvLow && arvHigh ? `${formatCurrency(arvLow)} - ${formatCurrency(arvHigh)}` : (suggestedArv ? formatCurrency(suggestedArv) : 'N/A')}
              </div>
              <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                {subjectSqft?.toLocaleString()} sq ft
              </div>
              <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                {subjectBeds} Bedrooms; {subjectBaths} Bathrooms
              </div>
              <div style={{ fontSize: '13px', color: '#374151' }}>
                Garage: {subjectHasGarage === undefined ? 'N/A' : (subjectHasGarage ? 'Yes' : 'No')}; Pool: {subjectHasPool === undefined ? 'N/A' : (subjectHasPool ? 'Yes' : 'No')}
              </div>
            </div>
            {subjectImageUrl && (
              <div style={{ width: '200px', height: '140px', overflow: 'hidden' }}>
                <img 
                  src={subjectImageUrl} 
                  alt="Subject Property" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}
          </div>

          {/* Comps Section */}
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px' }}>
            Comps
          </h2>

          {/* Summary Metrics */}
          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            marginBottom: '16px',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '16px',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Avg Square Feet</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>{avgSqft.toLocaleString()} sq ft</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Price Per Square Foot</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>{avgPricePerSqft != null ? `$${avgPricePerSqft.toFixed(0)}/sq ft` : 'N/A'}</div>
            </div>
          </div>

          {/* Comps Table */}
          <div style={{ marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>Address</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>Beds / Baths</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>Sqft</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>Distance</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>Sale Date</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>Sale Price</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#6b7280' }}>Price/Sqft</th>
                </tr>
              </thead>
              <tbody>
                {selectedComps.map((comp, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.address}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.bedrooms} / {comp.bathrooms}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.sqft?.toLocaleString()}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.distanceFromSubject != null ? `${comp.distanceFromSubject.toFixed(1)} mi` : '—'}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.isPending ? 'Pending' : formatDate(comp.saleDate)}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', fontWeight: '600' }}>
                      {formatCurrency(comp.salePrice)}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.pricePerSqft != null ? `$${comp.pricePerSqft.toFixed(0)}/sq ft` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stats Section */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
              Stats
            </div>
            <div style={{ display: 'flex', gap: '40px' }}>
              <div style={{ fontSize: '12px', color: '#374151' }}>
                <div style={{ marginBottom: '4px' }}>Avg Beds: {avgBeds}</div>
                <div style={{ marginBottom: '4px' }}>Avg Bathrooms: {avgBaths}</div>
                {avgLotSize && <div style={{ marginBottom: '4px' }}>Avg Lot Size: {avgLotSize} acres</div>}
                {avgYearBuilt > 0 && <div style={{ marginBottom: '4px' }}>Avg Year Built: {avgYearBuilt}</div>}
                {avgDistance !== null && <div style={{ marginBottom: '4px' }}>Avg Distance: {avgDistance} miles</div>}
                <div>Average Months Since Sale: {avgMonthsSinceSale}</div>
              </div>
            </div>
          </div>

          {/* Individual Comparable Properties Table */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
              Individual Comparable Properties
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '8px 4px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Address</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Sale Price</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Sale Date</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Sq Ft</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Price/Sq Ft</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Bed</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Bath</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Year Built</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Distance</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Pool</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Garage</th>
                </tr>
              </thead>
              <tbody>
                {selectedComps.map((comp, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                    <td style={{ padding: '8px 4px', borderBottom: '1px solid #f3f4f6' }}>
                      <div>{comp.address.length > 22 ? comp.address.substring(0, 22) + '...' : comp.address}</div>
                      <div style={{ fontSize: '9px', color: '#6b7280' }}>{comp.city}, {comp.state}</div>
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', fontWeight: '500' }}>
                      {formatCurrency(comp.salePrice)}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.isPending ? 'Pending' : formatShortDate(comp.saleDate)}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.sqft?.toLocaleString()}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.pricePerSqft != null ? `$${comp.pricePerSqft.toFixed(0)}` : '—'}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.bedrooms}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.bathrooms}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.yearBuilt || '—'}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.distanceFromSubject ? `${comp.distanceFromSubject.toFixed(1)} mi` : '—'}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.hasPool !== undefined ? (comp.hasPool ? 'Y' : 'N') : '—'}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                      {comp.hasGarage !== undefined ? (comp.hasGarage ? 'Y' : 'N') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                This comparable sales report was generated using RE Data Metrix™
              </div>
              <div style={{ fontSize: '12px', color: '#1f2937', fontWeight: '500' }}>
                Get your free account at redatametrix.com
              </div>
            </div>
            <div style={{ fontSize: '8px', color: '#9ca3af', textAlign: 'center' }}>
              Disclaimer: This report is for informational purposes only. Comparable sales data is based on publicly available records. 
              Always conduct your own due diligence and consult with qualified professionals before making investment decisions.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
