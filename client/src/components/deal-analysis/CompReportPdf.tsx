import { usePDF } from "react-to-pdf";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import logoPath from "@assets/Transparent Logo_1762969260481.png";

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
  
  // Parse MM/DD/YYYY format without timezone conversion
  const usMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const month = parseInt(usMatch[1], 10);
    const day = parseInt(usMatch[2], 10);
    const year = parseInt(usMatch[3], 10);
    return `${months[month - 1]} ${day}, ${year}`;
  }
  
  // Parse ISO format (YYYY-MM-DD) without timezone conversion
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    return `${months[month - 1]} ${day}, ${year}`;
  }
  
  // Fallback
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  suggestedArv,
  avgPricePerSqft,
  selectedComps,
}: CompReportPdfProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const safeAddress = subjectAddress || 'property';
  const { toPDF, targetRef } = usePDF({
    filename: `comp-report-${safeAddress.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
    page: {
      margin: 20,
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

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

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
            padding: '0.5in',
            backgroundColor: 'white',
            fontFamily: 'Arial, sans-serif',
            color: '#1a1a2e',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '3px solid #1a1a2e', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={logoPath} alt="RE Data Metrix" style={{ height: '48px', width: 'auto' }} />
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e' }}>RE Data Metrix™</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Comparable Sales Report</div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>
              <div>Report Date: {currentDate}</div>
            </div>
          </div>

          <div style={{ marginBottom: '24px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Subject Property
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '8px' }}>
              {subjectAddress}
            </div>
            <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '12px' }}>
              {subjectCity}, {subjectState} {subjectZip}
            </div>
            <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
              <span><strong>Beds:</strong> {subjectBeds}</span>
              <span><strong>Baths:</strong> {subjectBaths}</span>
              <span><strong>Sqft:</strong> {subjectSqft?.toLocaleString()}</span>
              {subjectYearBuilt && <span><strong>Year Built:</strong> {subjectYearBuilt}</span>}
            </div>
          </div>

          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a2e', color: 'white', padding: '16px', borderRadius: '8px' }}>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Based on {selectedComps.length} Comparable Sale{selectedComps.length !== 1 ? 's' : ''}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                Weighted Avg: ${avgPricePerSqft?.toFixed(0)}/sqft × {subjectSqft?.toLocaleString()} sqft
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Suggested ARV</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                {suggestedArv ? formatCurrency(suggestedArv) : 'N/A'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Comparable Properties
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '10px 6px', textAlign: 'left', borderBottom: '2px solid #1a1a2e', fontWeight: 'bold' }}>Address</th>
                  <th style={{ padding: '10px 6px', textAlign: 'right', borderBottom: '2px solid #1a1a2e', fontWeight: 'bold' }}>Sale Price</th>
                  <th style={{ padding: '10px 6px', textAlign: 'center', borderBottom: '2px solid #1a1a2e', fontWeight: 'bold' }}>Sale Date</th>
                  <th style={{ padding: '10px 6px', textAlign: 'center', borderBottom: '2px solid #1a1a2e', fontWeight: 'bold' }}>DOM</th>
                  <th style={{ padding: '10px 6px', textAlign: 'center', borderBottom: '2px solid #1a1a2e', fontWeight: 'bold' }}>Bed/Bath</th>
                  <th style={{ padding: '10px 6px', textAlign: 'right', borderBottom: '2px solid #1a1a2e', fontWeight: 'bold' }}>Sqft</th>
                  <th style={{ padding: '10px 6px', textAlign: 'right', borderBottom: '2px solid #1a1a2e', fontWeight: 'bold' }}>$/Sqft</th>
                  <th style={{ padding: '10px 6px', textAlign: 'right', borderBottom: '2px solid #1a1a2e', fontWeight: 'bold' }}>Dist</th>
                </tr>
              </thead>
              <tbody>
                {selectedComps.map((comp, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 6px' }}>
                      <div style={{ fontWeight: '500' }}>{comp.address}</div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>{comp.city}, {comp.state}</div>
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 'bold', color: '#1a1a2e' }}>
                      {formatCurrency(comp.salePrice)}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                      {comp.isPending ? (
                        <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '500' }}>Pending</span>
                      ) : formatDate(comp.saleDate)}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                      {comp.daysOnMarket ?? '—'}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                      {comp.bedrooms}/{comp.bathrooms}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                      {comp.sqft?.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                      ${comp.pricePerSqft?.toFixed(0)}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                      {comp.distanceFromSubject ? `${comp.distanceFromSubject.toFixed(1)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
                This comparable sales report was generated using RE Data Metrix™
              </div>
              <div style={{ fontSize: '12px', color: '#1a1a2e', fontWeight: '500' }}>
                Get your free account at redatametrix.com
              </div>
            </div>
            <div style={{ fontSize: '9px', color: '#9ca3af', textAlign: 'center' }}>
              Disclaimer: This report is for informational purposes only. Comparable sales data is based on publicly available records. 
              Always conduct your own due diligence and consult with qualified professionals before making investment decisions.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
