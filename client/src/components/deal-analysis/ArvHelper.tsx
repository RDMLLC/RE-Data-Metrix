import { useState, useMemo, useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import { WizardFormData } from "./DealAnalysisWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Loader2,
  Home,
  MapPin,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  Clock,
  Pencil,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import ArvQuotaExhaustedModal from "./ArvQuotaExhaustedModal";
import CompReportPdf from "./CompReportPdf";

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
  lotSize?: number;
  propertyType?: string;
  daysOnMarket?: number;
  imageUrl?: string;
  distanceFromSubject?: number;
  listingUrl?: string;
  isManuallyAdded?: boolean;
  isPending?: boolean;
  similarityScore?: number;
  distressedFlag?: boolean;
  outlierFlag?: boolean;
  latitude?: number;
  longitude?: number;
}

interface CompsSearchResponse {
  comps: SoldPropertyComp[];
  suggestedArv: number | null;
  weightedAvgPricePerSqft?: number;
  message?: string;
  radiusExpanded?: boolean;
  actualRadiusMiles?: number;
  dateRangeExpanded?: boolean;
  actualDateRangeDays?: number;
  // Server-reported counts after the full hybrid expansion sequence has run.
  // Used to gate the PropStream fallback callout when there are too few
  // suitable comps to support a reliable ARV estimate.
  searchStats?: {
    suitableCount?: number;
  };
}

interface ArvHelperProps {
  form: UseFormReturn<WizardFormData>;
  onClose: () => void;
}

// Smart initial selection: two-tier strategy that picks up to 3 clean comps,
// preferring same-city matches but falling back to nearest out-of-city comps
// rather than excluding them.
//
// "Clean" filter (applied before tiering):
//   - Exclude distressedFlag
//   - Exclude outlierFlag
//   - Exclude bedroom counts outside 0-10 (data-scraping errors)
//   - Exclude bedroom delta > 1 from subject
//
// Tier 1: from clean comps with cityMismatch falsy (same city as subject),
//         sorted by distance ascending — take up to 3.
// Tier 2: if Tier 1 yielded fewer than 3, fill remaining slots from the
//         nearest clean comps regardless of city, skipping any already
//         chosen in Tier 1.
//
// The cityMismatch flag itself is preserved on each comp and continues to
// drive the amber visual indicator in the row UI — it just no longer
// hard-excludes the comp from auto-selection.
//
// Optional `preserveIndices`: indices that must stay selected (e.g. user
// survivors from a prior radius). They are kept first; tiering only fills
// the remaining slots up to a total of 3.
function computeSmartSelection(
  comps: SoldPropertyComp[],
  subjectBedrooms: number,
  subjectBathrooms: number,
  subjectSqft: number = 1500,
  preserveIndices: Set<number> = new Set(),
): Set<number> {
  const selected = new Set<number>(preserveIndices);
  if (selected.size >= 3) return selected;

  const allPrices = comps.map(x => x.pricePerSqft).filter(p => p > 0).sort((a,b) => a-b);
  const medianPpsf = allPrices.length > 0 ? allPrices[Math.floor(allPrices.length / 2)] : null;
  const extremeOutlierThreshold = medianPpsf ? medianPpsf * 3 : Infinity;
  const cleanSorted = comps
    .map((comp, i) => ({ comp, i }))
    .filter(({ comp, i }) => {
      if (selected.has(i)) return false;
      const beds = comp.bedrooms;
      if (typeof beds === "number" && (beds > 10 || beds < 0)) return false;
      const baths = comp.bathrooms;
      return (
        !comp.distressedFlag &&
        !(!comp.saleDate || comp.saleDate === "" || comp.saleDate === "N/A" || comp.saleDate === "Pending") &&
        Math.abs((beds ?? subjectBedrooms) - subjectBedrooms) <= 1 &&
        Math.abs(Math.round(baths ?? subjectBathrooms) - Math.round(subjectBathrooms)) <= 1
      );
    })
    .sort(
    (a, b) => {
      const med = medianPpsf || 150;
      const subSqft = subjectSqft || 1500;
      const dA = a.comp.distanceFromSubject ?? Infinity;
      const dB = b.comp.distanceFromSubject ?? Infinity;
      const pA = a.comp.pricePerSqft ?? 0;
      const pB = b.comp.pricePerSqft ?? 0;
      const bA = Math.round(a.comp.bathrooms ?? subjectBathrooms) === Math.round(subjectBathrooms) ? 1.2 : 1.0;
      const bB = Math.round(b.comp.bathrooms ?? subjectBathrooms) === Math.round(subjectBathrooms) ? 1.2 : 1.0;
      const bdA = (a.comp.bedrooms ?? subjectBedrooms) === subjectBedrooms ? 1.2 : 1.0;
      const bdB = (b.comp.bedrooms ?? subjectBedrooms) === subjectBedrooms ? 1.2 : 1.0;
      const sqA = 1 - Math.abs((a.comp.sqft ?? subSqft) - subSqft) / subSqft;
      const sqB = 1 - Math.abs((b.comp.sqft ?? subSqft) - subSqft) / subSqft;
      const sA = dA > 0 ? (1 / dA) * (pA / med) * bA * bdA * sqA : Infinity;
      const sB = dB > 0 ? (1 / dB) * (pB / med) * bB * bdB * sqB : Infinity;
      return sB - sA;
    },
    );


    // Tier 1: same-city (cityMismatch falsy) clean comps, nearest first.
  // Exclude extreme outliers (>3x median ppsf) from auto-selection
  const filteredSorted = cleanSorted.filter(({ comp }) => comp.pricePerSqft <= extremeOutlierThreshold);
  for (const { comp, i } of filteredSorted) {
    if (selected.size >= 3) break;
    if (!(comp as any).cityMismatch) selected.add(i);
  }

  // Tier 2: fill any remaining slots from nearest clean comps regardless
  // of city, skipping anything already chosen above.
  if (selected.size < 3) {
    for (const { i } of filteredSorted) {
      if (selected.size >= 3) break;
      selected.add(i);
    }
  }

  return selected;
}

export default function ArvHelper({ form, onClose }: ArvHelperProps) {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();

  const city = form.watch("city") || "";
  const state = form.watch("state") || "";
  const NON_DISCLOSURE_STATES: Record<string, string> = {
    AK: 'Alaska', ID: 'Idaho', IN: 'Indiana', KS: 'Kansas', LA: 'Louisiana',
    ME: 'Maine', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NM: 'New Mexico',
    ND: 'North Dakota', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
    UT: 'Utah', WY: 'Wyoming'
  };
  const stateCode = state.trim().toUpperCase().slice(0, 2);
  const isNonDisclosure = !!NON_DISCLOSURE_STATES[stateCode];
  const stateName = NON_DISCLOSURE_STATES[stateCode] || state;
  const companyName = user?.reportCompanyName || 'your company';
  const propStreamUrl = 'https://trial.propstreampro.com/redatametrix';
  const zipCode = form.watch("zipCode") || "";
  const address = form.watch("address") || "";
  const bedrooms = form.watch("bedrooms") || 3;
  const bathrooms = form.watch("bathrooms") || 2;
  const sqft = form.watch("sqft") || 1500;
  const yearBuilt = form.watch("yearBuilt");
  const lotSize = form.watch("lotSize");
  const propertyType = form.watch("propertyType") || "";
  const propertyLatitude = form.watch("propertyLatitude");
  const propertyLongitude = form.watch("propertyLongitude");

  const [repairBedrooms, setRepairBedrooms] = useState<number | null>(null);
  const [repairBathrooms, setRepairBathrooms] = useState<number | null>(null);
  const [repairSqft, setRepairSqft] = useState<number | null>(null);
  const [showRepairPanel, setShowRepairPanel] = useState(false);
  const [repairBedroomsInput, setRepairBedroomsInput] = useState("");
  const [repairBathroomsInput, setRepairBathroomsInput] = useState("");
  const [repairSqftInput, setRepairSqftInput] = useState("");
  const effectiveBedrooms = repairBedrooms ?? bedrooms;
  const effectiveBathrooms = repairBathrooms ?? bathrooms;
  const effectiveSqft = repairSqft ?? sqft;
  const hasRepairOverride = repairBedrooms !== null || repairBathrooms !== null || repairSqft !== null;

  const [isSearchingComps, setIsSearchingComps] = useState(false);
  const [compsData, setCompsData] = useState<CompsSearchResponse | null>(null);
  const [radiusWasExpanded, setRadiusWasExpanded] = useState(false);
  const [actualRadiusUsed, setActualRadiusUsed] = useState<number | null>(null);
  const [dateRangeWasExpanded, setDateRangeWasExpanded] = useState(false);
  const [actualDateRangeUsed, setActualDateRangeUsed] = useState<number | null>(null);
  const [expandedCompIndex, setExpandedCompIndex] = useState<number | null>(null);
  const [compsError, setCompsError] = useState<string | null>(null);

  type RadiusOption = 0.5 | 1 | 2 | 3 | 5;
  const [searchRadius, setSearchRadius] = useState<RadiusOption>(0.5);

  type DateRangeOption = 180 | 270 | 365;
  const [searchDateRange, setSearchDateRange] = useState<DateRangeOption>(180);

  const [selectedCompIndices, setSelectedCompIndices] = useState<Set<number>>(new Set());
  // Locked selection captured SYNCHRONOUSLY at the moment a manual radius
  // button is clicked. Holds compKey ADDRESS strings (not indices) so the
  // selection survives a refetch even when the new comps array has a
  // different length or order. searchCompsWithOptions remaps these address
  // keys back to numeric indices against the new data.comps. Cleared after
  // each use.
  const lockedSelectionRef = useRef<Set<string> | null>(null);
  // Snapshot of compsData captured synchronously at the top of
  // searchCompsWithOptions, before setCompsData(null) clears state. Used to
  // re-introduce locked comps that didn't survive the new search so the
  // user's selection can be preserved across radius changes.
  const previousCompsDataRef = useRef<typeof compsData>(null);
  const [showArvQuotaModal, setShowArvQuotaModal] = useState(false);

  const [showAddCompForm, setShowAddCompForm] = useState(false);
  const [customCompUrl, setCustomCompUrl] = useState("");
  const [isAddingCustomComp, setIsAddingCustomComp] = useState(false);
  const [customCompError, setCustomCompError] = useState<string | null>(null);

  // Manual comp entry — bypasses the Zillow URL fetch entirely so users can
  // type in a comp from any source (MLS sheet, Propstream export, neighbor
  // gossip, etc.). On submit, the comp is prepended to compsData.comps and
  // auto-selected, exactly like a Zillow URL add.
  const [manualComp, setManualComp] = useState({
    address: "",
    city: "",
    state: "",
    zipCode: "",
    bedrooms: "",
    bathrooms: "",
    sqft: "",
    salePrice: "",
    saleDate: "",
  });
  const [manualCompError, setManualCompError] = useState<string | null>(null);
  // Toggles whether the manual-entry fields are visible. Hidden by default
  // so the panel stays compact; user clicks "+ Add Manual Comp" to expand.
  const [showManualForm, setShowManualForm] = useState(false);

  const [pendingProperties, setPendingProperties] = useState<SoldPropertyComp[]>([]);
  const [isSearchingPending, setIsSearchingPending] = useState(false);
  const [showPendingProperties, setShowPendingProperties] = useState(false);

  const [editingCompIndex, setEditingCompIndex] = useState<number | null>(null);
  const [editFormValues, setEditFormValues] = useState<{
    salePrice: string;
    propertyType: string;
  }>({ salePrice: "", propertyType: "" });

  type SortField = "distance" | "salePrice" | "saleDate" | "pricePerSqft" | "sqft" | "bedBath";
  // null = no column actively selected → default grouping (selected comps
  // first, then unselected, both by distance asc). Becomes a SortField the
  // moment the user clicks any column header.
  type SortDirection = "asc" | "desc";
  const [compsSortField, setCompsSortField] = useState<SortField | null>(null);
  const [compsSortDirection, setCompsSortDirection] = useState<SortDirection>("asc");

  // Stable identity key for a comp: house-number + ZIP. Resilient to street-suffix
  // variations (Trl vs Trail, Dr vs Drive) that can occur when the same property
  // is fetched from different sources or at different radii. Mirrors the helper
  // used in Step3PurchaseRenovation.tsx.
  const compKey = (c: { address?: string; zipCode?: string }): string => {
    const addr = (c.address || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const zip = (c.zipCode || '').replace(/\D/g, '').slice(0, 5);
    return `${addr}|${zip}`;
  };

  type DateFilter = "all" | "6" | "9";
  const [compsDateFilter] = useState<DateFilter>("all");

  const filterCutoffDate = useMemo(() => {
    const date = new Date();
    if (compsDateFilter === "6") date.setMonth(date.getMonth() - 6);
    else if (compsDateFilter === "9") date.setMonth(date.getMonth() - 9);
    return date.getTime();
  }, [compsDateFilter]);

  // All comps shown — no hidden outliers. Flagged comps always sort to the bottom of each
  // group regardless of the active sort column, then within each group apply normal sort.
  const sortedCompsWithIndices = useMemo(() => {
    if (!compsData || !compsData.comps.length) return [];
    let compsWithIndices = compsData.comps.map((comp, originalIndex) => ({
      comp,
      originalIndex,
    }));
    if (compsDateFilter !== "all") {
      compsWithIndices = compsWithIndices.filter(({ comp }) => {
        const saleDate = new Date(comp.saleDate).getTime();
        return saleDate >= filterCutoffDate;
      });
    }
    return compsWithIndices.sort((a, b) => {
      // Default mode (no column actively selected): selected comps on top,
      // unselected on bottom, both sub-sorted by distance ascending. Flagged
      // sinking and the active-column path do NOT apply here.
      if (compsSortField === null) {
        const aSelected = selectedCompIndices.has(a.originalIndex);
        const bSelected = selectedCompIndices.has(b.originalIndex);
        if (aSelected !== bSelected) return aSelected ? -1 : 1;
        const aDist = a.comp.distanceFromSubject ?? 999;
        const bDist = b.comp.distanceFromSubject ?? 999;
        return aDist - bDist;
      }

      // Within the same group, apply the active sort column
      let aVal: number, bVal: number;
      switch (compsSortField) {
        case "salePrice":
          aVal = a.comp.salePrice;
          bVal = b.comp.salePrice;
          break;
        case "saleDate":
          aVal = new Date(a.comp.saleDate).getTime();
          bVal = new Date(b.comp.saleDate).getTime();
          break;
        case "pricePerSqft":
          aVal = a.comp.pricePerSqft;
          bVal = b.comp.pricePerSqft;
          break;
        case "sqft":
          aVal = a.comp.sqft;
          bVal = b.comp.sqft;
          break;
        case "bedBath":
          aVal = (a.comp.bedrooms ?? 0) * 10 + (a.comp.bathrooms ?? 0);
          bVal = (b.comp.bedrooms ?? 0) * 10 + (b.comp.bathrooms ?? 0);
          break;
        case "distance":
        default:
          aVal = a.comp.distanceFromSubject ?? 999;
          bVal = b.comp.distanceFromSubject ?? 999;
          break;
      }
      let diff = aVal - bVal;
      if (diff === 0) {
        const aDate = new Date(a.comp.saleDate).getTime();
        const bDate = new Date(b.comp.saleDate).getTime();
        diff = bDate - aDate;
      }
      return compsSortDirection === "asc" ? diff : -diff;
    });
  }, [compsData, compsSortField, compsSortDirection, compsDateFilter, filterCutoffDate, selectedCompIndices]);

  const toggleSort = (field: SortField) => {
    if (compsSortField === field) {
      setCompsSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setCompsSortField(field);
      setCompsSortDirection(field === "distance" ? "asc" : "desc");
    }
  };

  // ARV uses only selectedCompIndices — no hidden-set cross-reference.
  // Requires at least 2 selected comps; below that, arv/avgPricePerSqft
  // are returned as null (rendered as "N/A") and the action buttons are
  // disabled. A 2-comp ARV is calculated but accompanied by a warning
  // recommending 3+ for a reliable estimate.
  const calculateSelectedArv = () => {
    if (!compsData || compsData.comps.length === 0)
      return { arv: null, avgPricePerSqft: null, count: 0 };
    const selectedComps = compsData.comps.filter(
      (_, index) => selectedCompIndices.has(index)
    );
    if (selectedComps.length < 2) {
      return { arv: null, avgPricePerSqft: null, count: selectedComps.length };
    }
    const totalSalePrice = selectedComps.reduce((sum, comp) => sum + comp.salePrice, 0);
    const totalSqft = selectedComps.reduce((sum, comp) => sum + comp.sqft, 0);
    const avgPricePerSqft = Math.round(totalSalePrice / totalSqft);
    const calculatedArv = Math.round(avgPricePerSqft * effectiveSqft);
    return { arv: calculatedArv, avgPricePerSqft, count: selectedComps.length };
  };

  const selectedArvData = calculateSelectedArv();

  // Wide range warning — recomputes whenever selection or data changes
  const wideRangeWarning = useMemo(() => {
    if (!compsData || selectedCompIndices.size < 2) return null;

    const selectedComps = compsData.comps.filter((_, i) => selectedCompIndices.has(i));
    const unselectedComps = compsData.comps.filter((_, i) => !selectedCompIndices.has(i));

    const selectedPrices = selectedComps.map(c => c.pricePerSqft).filter(p => p > 0);
    if (selectedPrices.length < 2) return null;

    const minSelected = Math.min(...selectedPrices);
    const maxSelected = Math.max(...selectedPrices);
    if (minSelected <= 0) return null;

    // Condition 1: wide spread among selected comps (>40% of min)
    const selectedSpread = (maxSelected - minSelected) / minSelected;

    // Condition 2: selected comps cluster significantly above unselected (>40%)
    let selectedAboveUnselected = false;
    if (unselectedComps.length > 0) {
      const unselectedPrices = unselectedComps.map(c => c.pricePerSqft).filter(p => p > 0);
      if (unselectedPrices.length > 0) {
        const avgSelected = selectedPrices.reduce((a, b) => a + b, 0) / selectedPrices.length;
        const avgUnselected = unselectedPrices.reduce((a, b) => a + b, 0) / unselectedPrices.length;
        if (avgUnselected > 0) {
          selectedAboveUnselected = (avgSelected - avgUnselected) / avgUnselected > 0.4;
        }
      }
    }

    if (selectedSpread > 0.4 || selectedAboveUnselected) {
      return "This area shows a significant price gap between selected and unselected comps below. This may indicate a mix of distressed and renovated sales. If you are analyzing a renovation project, confirm your selected comps reflect the repaired condition. If not, deselect and review.";
    }

    return null;
  }, [selectedCompIndices, compsData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    if (dateStr.toLowerCase() === "pending") return "Pending";
    try {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (usMatch) {
        return `${months[parseInt(usMatch[1], 10) - 1]} ${parseInt(usMatch[2], 10)}, ${usMatch[3]}`;
      }
      const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        return `${months[parseInt(isoMatch[2], 10) - 1]} ${parseInt(isoMatch[3], 10)}, ${isoMatch[1]}`;
      }
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const extractApiError = (error: any, fallback: string): string => {
    try {
      const jsonMatch = error?.message?.match(/\d+:\s*(.+)/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        if (data.error) return data.error;
      }
    } catch {}
    return fallback;
  };

  const searchComps = async () => {
    if (!city || !state) {
      toast({
        title: "Missing Location",
        description: "City and state are required to search for comparables.",
        variant: "destructive",
      });
      return;
    }
    setIsSearchingComps(true);
    setCompsError(null);
    setCompsData(null);
    setRadiusWasExpanded(false);
    setActualRadiusUsed(null);
    setDateRangeWasExpanded(false);
    setActualDateRangeUsed(null);
    try {
      const response = await apiRequest("POST", "/api/comps/search", {
        address, city, state, zipCode, bedrooms: effectiveBedrooms, bathrooms: effectiveBathrooms, sqft: effectiveSqft, propertyType,
        subjectLat: propertyLatitude, subjectLng: propertyLongitude,
        radiusMiles: searchRadius, saleDateRangeDays: searchDateRange,
      });
      const data = await response.json();
      setCompsData(data);
      setRadiusWasExpanded(data.radiusExpanded ?? false);
      setActualRadiusUsed(data.actualRadiusMiles ?? null);
      setDateRangeWasExpanded(data.dateRangeExpanded ?? false);
      setActualDateRangeUsed(data.actualDateRangeDays ?? null);
      // Make expanded date range sticky: if the backend auto-expanded the
      // date window, adopt the expanded value as the new searchDateRange so
      // subsequent radius clicks reuse it instead of reverting to the
      // originally requested window.
      if (data.dateRangeExpanded && data.actualDateRangeDays) {
        setSearchDateRange(data.actualDateRangeDays);
      }
      if (data.comps && data.comps.length > 0) {
        // Fresh search — clear any existing lock so the new auto-selection
        // is not overridden by a previous radius-change lock.
        lockedSelectionRef.current = null;
        setSelectedCompIndices(computeSmartSelection(data.comps, effectiveBedrooms, effectiveBathrooms, effectiveSqft));
      }
    } catch (error: any) {
      if (error?.message?.includes("ARV_QUOTA_EXCEEDED")) {
        setShowArvQuotaModal(true);
      } else {
        setCompsError(extractApiError(error, "Failed to search for comparable sales"));
      }
    } finally {
      setIsSearchingComps(false);
    }
  };

  const searchCompsWithOptions = async (radius: RadiusOption, dateRange: DateRangeOption) => {
    if (!city || !state) return;

    // Capture current comps SYNCHRONOUSLY before any state mutation clears
    // them, so the selection-merge fallback can re-introduce locked comps
    // that didn't survive the new search.
    previousCompsDataRef.current = compsData;

    setIsSearchingComps(true);
    setCompsError(null);
    setCompsData(null);
    setRadiusWasExpanded(false);
    setActualRadiusUsed(null);
    setDateRangeWasExpanded(false);
    setActualDateRangeUsed(null);
    try {
      const response = await apiRequest("POST", "/api/comps/search", {
        address, city, state, zipCode, bedrooms: effectiveBedrooms, bathrooms: effectiveBathrooms, sqft: effectiveSqft, propertyType,
        subjectLat: propertyLatitude, subjectLng: propertyLongitude,
        radiusMiles: radius, saleDateRangeDays: dateRange,
      });
      const data = await response.json();
      setCompsData(data);
      setRadiusWasExpanded(data.radiusExpanded ?? false);
      setActualRadiusUsed(data.actualRadiusMiles ?? null);
      setDateRangeWasExpanded(data.dateRangeExpanded ?? false);
      setActualDateRangeUsed(data.actualDateRangeDays ?? null);
      // Make expanded date range sticky: if the backend auto-expanded the
      // date window, adopt the expanded value as the new searchDateRange so
      // subsequent radius clicks reuse it instead of reverting to the
      // originally requested window.
      if (data.dateRangeExpanded && data.actualDateRangeDays) {
        setSearchDateRange(data.actualDateRangeDays);
      }
      if (data.comps && data.comps.length > 0) {
        // If a manual radius click captured locked address keys (≥3), remap
        // them to indices in the new comps array. Only honor the lock if at
        // least 3 of the locked addresses survived the refetch — otherwise
        // fall back to a fresh computeSmartSelection.
        if (lockedSelectionRef.current !== null && lockedSelectionRef.current.size >= 1) {
          const newIndices = new Set<number>();
          (data.comps as SoldPropertyComp[]).forEach((c, i) => {
            if (lockedSelectionRef.current!.has(compKey(c))) {
              newIndices.add(i);
            }
          });
          if (newIndices.size >= 3) {
            setSelectedCompIndices(newIndices);
          } else {
            // Fewer than 3 locked addresses survived the new search. Try
            // appending the missing locked comps from the previous search so
            // the user's selection is preserved across the radius change.
            const lockedKeys = lockedSelectionRef.current!;
            const missingComps = (previousCompsDataRef.current?.comps ?? [])
              .filter(
                (c) =>
                  lockedKeys.has(compKey(c)) &&
                  !data.comps.some(
                    (nc: SoldPropertyComp) => compKey(nc) === compKey(c),
                  ),
              );
            const mergedComps = [...data.comps, ...missingComps];
            const mergedIndices = new Set<number>();
            mergedComps.forEach((c, i) => {
              if (lockedKeys.has(compKey(c as SoldPropertyComp))) {
                mergedIndices.add(i);
              }
            });
            if (mergedIndices.size >= 3) {
              setCompsData({ ...data, comps: mergedComps });
              const trimmedIndices = new Set<number>(Array.from(mergedIndices).slice(0, 3));
              setSelectedCompIndices(trimmedIndices);
            } else if (mergedIndices.size > 0) {
              // Some survivors exist but fewer than 3 total. Preserve those
              // survivors and fill remaining slots from the new search using
              // the two-tier strategy (same-city fillers first, then any-
              // city) baked into computeSmartSelection.
              setCompsData({ ...data, comps: mergedComps });
              setSelectedCompIndices(
                computeSmartSelection(mergedComps, effectiveBedrooms, effectiveBathrooms, effectiveSqft, mergedIndices),
              );
            } else {
              setSelectedCompIndices(computeSmartSelection(data.comps, effectiveBedrooms, effectiveBathrooms));
            }
          }
        } else {
          setSelectedCompIndices(computeSmartSelection(data.comps, effectiveBedrooms, effectiveBathrooms));
        }
        // Do NOT clear the lock here — keep it alive so subsequent
        // auto-expansions by the backend don't trigger a fresh
        // computeSmartSelection that overrides the user's manual picks.
        // The lock is cleared only by a fresh Search Comps press.
      }
    } catch (error: any) {
      if (error?.message?.includes("ARV_QUOTA_EXCEEDED")) {
        setShowArvQuotaModal(true);
      } else {
        setCompsError(extractApiError(error, "Failed to search for comparable sales"));
      }
    } finally {
      setIsSearchingComps(false);
    }
  };

  const searchPendingProperties = async () => {
    if (!city || !state) return;
    setIsSearchingPending(true);
    try {
      const response = await apiRequest("POST", "/api/comps/search-pending", {
        city, state, zipCode, bedrooms: effectiveBedrooms, bathrooms: effectiveBathrooms, sqft: effectiveSqft, propertyType,
        subjectLat: propertyLatitude, subjectLng: propertyLongitude,
      });
      const data = await response.json();
      const pendingWithFlag = (data.pendingProperties || []).map((p: SoldPropertyComp) => ({
        ...p, isPending: true, saleDate: "Pending",
      }));
      setPendingProperties(pendingWithFlag);
      setShowPendingProperties(true);
    } catch (error: any) {
      console.error("Pending search error:", error);
    } finally {
      setIsSearchingPending(false);
    }
  };

  const addPendingToComps = (pending: SoldPropertyComp) => {
    if (!compsData) return;
    const alreadyAdded = compsData.comps.some(
      (c) => c.address.toLowerCase() === pending.address.toLowerCase()
    );
    if (alreadyAdded) return;
    const newComp: SoldPropertyComp = { ...pending, isPending: true, isManuallyAdded: true };
    setCompsData({ ...compsData, comps: [...compsData.comps, newComp] });
    setSelectedCompIndices((prev) => {
      const newSet = new Set(prev);
      newSet.add(compsData.comps.length);
      return newSet;
    });
  };

  const addCustomComp = async () => {
    if (!customCompUrl.trim()) { setCustomCompError("Please enter a Zillow URL"); return; }
    if (!customCompUrl.includes("zillow.com")) { setCustomCompError("Please enter a valid Zillow URL"); return; }
    setIsAddingCustomComp(true);
    setCustomCompError(null);
    try {
      const response = await apiRequest("POST", "/api/comps/fetch-from-url", {
        url: customCompUrl,
        subjectLat: propertyLatitude,
        subjectLng: propertyLongitude,
      });
      const data = await response.json();
      if (data.comp) {
        const newComp = data.comp;
        const newCompAddress = newComp.address.toLowerCase().trim();
        const existingComps = compsData?.comps || [];
        const duplicateIndices: number[] = [];
        existingComps.forEach((comp, index) => {
          if (comp.address.toLowerCase().trim() === newCompAddress) duplicateIndices.push(index);
        });
        setCompsData((prev) => {
          if (!prev) return { comps: [newComp], suggestedArv: null };
          return { ...prev, comps: [newComp, ...prev.comps] };
        });
        setSelectedCompIndices((prev) => {
          const newSet = new Set<number>();
          newSet.add(0);
          prev.forEach((oldIndex) => {
            const shiftedIndex = oldIndex + 1;
            if (!duplicateIndices.includes(oldIndex)) newSet.add(shiftedIndex);
          });
          return newSet;
        });
        setCustomCompUrl("");
        setShowAddCompForm(false);
        toast({
          title: "Comp Added",
          description:
            duplicateIndices.length > 0
              ? `${newComp.address} added. Older sale${duplicateIndices.length > 1 ? "s" : ""} for this address deselected.`
              : `${newComp.address} has been added to your comps list.`,
        });
      }
    } catch (error: any) {
      setCustomCompError(extractApiError(error, "Failed to fetch property data"));
    } finally {
      setIsAddingCustomComp(false);
    }
  };

  // Manual comp entry handler. Mirrors addCustomComp's prepend + duplicate
  // detection + index-shift logic so the resulting state is identical to a
  // successful Zillow URL add.
  const addManualComp = () => {
    setManualCompError(null);
    const trimmed = {
      address: manualComp.address.trim(),
      city: manualComp.city.trim(),
      state: manualComp.state.trim().toUpperCase(),
      zipCode: manualComp.zipCode.trim(),
      bedrooms: manualComp.bedrooms.trim(),
      bathrooms: manualComp.bathrooms.trim(),
      sqft: manualComp.sqft.replace(/[^0-9]/g, ""),
      salePrice: manualComp.salePrice.replace(/[^0-9.]/g, ""),
      saleDate: manualComp.saleDate.trim(),
    };
    if (
      !trimmed.address || !trimmed.city || !trimmed.state || !trimmed.zipCode ||
      !trimmed.bedrooms || !trimmed.bathrooms || !trimmed.sqft ||
      !trimmed.salePrice || !trimmed.saleDate
    ) {
      setManualCompError("Please fill in all fields.");
      return;
    }
    const sqft = parseInt(trimmed.sqft, 10);
    const salePrice = parseFloat(trimmed.salePrice);
    const bedrooms = parseFloat(trimmed.bedrooms);
    const bathrooms = parseFloat(trimmed.bathrooms);
    if (!Number.isFinite(sqft) || sqft <= 0) {
      setManualCompError("Sqft must be a positive number.");
      return;
    }
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      setManualCompError("Sale price must be a positive number.");
      return;
    }
    if (!Number.isFinite(bedrooms) || !Number.isFinite(bathrooms)) {
      setManualCompError("Beds and baths must be numbers.");
      return;
    }
    const newComp: SoldPropertyComp = {
      address: trimmed.address,
      city: trimmed.city,
      state: trimmed.state,
      zipCode: trimmed.zipCode,
      salePrice,
      saleDate: trimmed.saleDate,
      bedrooms,
      bathrooms,
      sqft,
      pricePerSqft: Math.round(salePrice / sqft),
      isManuallyAdded: true,
    };
    const newCompAddress = newComp.address.toLowerCase().trim();
    const existingComps = compsData?.comps || [];
    const duplicateIndices: number[] = [];
    existingComps.forEach((comp, index) => {
      if (comp.address.toLowerCase().trim() === newCompAddress) duplicateIndices.push(index);
    });
    setCompsData((prev) => {
      if (!prev) return { comps: [newComp], suggestedArv: null };
      return { ...prev, comps: [newComp, ...prev.comps] };
    });
    setSelectedCompIndices((prev) => {
      const newSet = new Set<number>();
      newSet.add(0);
      prev.forEach((oldIndex) => {
        const shiftedIndex = oldIndex + 1;
        if (!duplicateIndices.includes(oldIndex)) newSet.add(shiftedIndex);
      });
      return newSet;
    });
    setManualComp({
      address: "", city: "", state: "", zipCode: "",
      bedrooms: "", bathrooms: "", sqft: "",
      salePrice: "", saleDate: "",
    });
    setShowManualForm(false);
    setShowAddCompForm(false);
    toast({
      title: "Comp Added",
      description:
        duplicateIndices.length > 0
          ? `${newComp.address} added. Older sale${duplicateIndices.length > 1 ? "s" : ""} for this address deselected.`
          : `${newComp.address} has been added to your comps list.`,
    });
  };

  const openEditDialog = (index: number) => {
    if (!compsData) return;
    const comp = compsData.comps[index];
    setEditFormValues({ salePrice: comp.salePrice.toString(), propertyType: comp.propertyType || "" });
    setEditingCompIndex(index);
  };

  const saveCompEdit = () => {
    if (editingCompIndex === null || !compsData) return;
    const newPrice = parseFloat(editFormValues.salePrice.replace(/[^0-9.]/g, ""));
    if (isNaN(newPrice) || newPrice <= 0) {
      toast({ title: "Invalid Price", description: "Please enter a valid price.", variant: "destructive" });
      return;
    }
    const comp = compsData.comps[editingCompIndex];
    const compSqft = comp.sqft && comp.sqft > 0 ? comp.sqft : 1;
    const newPricePerSqft = Math.round(newPrice / compSqft);
    setCompsData((prev) => {
      if (!prev) return prev;
      const updatedComps = [...prev.comps];
      updatedComps[editingCompIndex] = {
        ...updatedComps[editingCompIndex],
        salePrice: newPrice,
        pricePerSqft: newPricePerSqft,
        propertyType: editFormValues.propertyType || updatedComps[editingCompIndex].propertyType,
      };
      return { ...prev, comps: updatedComps };
    });
    toast({ title: "Comp Updated", description: `${comp.address} has been updated.` });
    setEditingCompIndex(null);
  };

  return (
    <>
      <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
        {/* Beta Notice */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          This ARV calculator is in beta. We are working to refine it. Thank you for your patience and understanding.
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Find Comparable Sales</h4>
            <p className="text-xs text-muted-foreground">
              Search for recently sold properties similar to yours to estimate ARV
            </p>
            {address && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground bg-muted/50 rounded-md px-3 py-2 mt-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    {address}, {city}, {state} {zipCode}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {effectiveBedrooms && effectiveBathrooms && (
                      <span className="flex items-center gap-1">
                        <Home className="h-3 w-3" />
                        {effectiveBedrooms}/{effectiveBathrooms}
                        {(repairBedrooms !== null || repairBathrooms !== null) && (
                          <span className="text-primary font-medium">(modified)</span>
                        )}
                      </span>
                    )}
                    {effectiveSqft && (
                      <span className="flex items-center gap-1">
                        {effectiveSqft.toLocaleString()} sqft
                        {repairSqft !== null && (
                          <span className="text-primary font-medium">(modified)</span>
                        )}
                      </span>
                    )}
                    {yearBuilt && <span className="flex items-center gap-1">{yearBuilt}</span>}
                    {lotSize && <span className="flex items-center gap-1">{lotSize.toLocaleString()} sqft lot</span>}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    const zillowAddress = `${address} ${city} ${state} ${zipCode}`
                      .replace(/\s+/g, "-")
                      .replace(/[,#]/g, "");
                    window.open(`https://www.zillow.com/homes/${encodeURIComponent(zillowAddress)}_rb/`, "_blank");
                  }}
                  data-testid="button-view-subject-zillow"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View on Zillow
                </Button>
              </div>
            )}
            <div className="mt-1 px-1">
              <button
                className="text-xs font-bold text-foreground hover:text-primary underline underline-offset-2 transition-colors flex items-center gap-1"
                onClick={() => {
                  if (!showRepairPanel) {
                    setRepairBedroomsInput(String(repairBedrooms ?? bedrooms));
                    setRepairBathroomsInput(String(repairBathrooms ?? bathrooms));
                    setRepairSqftInput(String(repairSqft ?? sqft));
                  }
                  setShowRepairPanel(!showRepairPanel);
                }}
              >
                <Pencil className="h-3 w-3" />
                {showRepairPanel ? "Hide" : "Changing beds, baths, or sqft?"}
              </button>
              {showRepairPanel && (
                <div className="mt-2 flex flex-wrap items-end gap-3 p-3 bg-muted/50 rounded-md border border-border">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Beds after repair</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={repairBedroomsInput}
                      onChange={(e) => setRepairBedroomsInput(e.target.value)}
                      className="w-20 text-sm px-2 py-1 border border-border rounded bg-background text-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Baths after repair</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={repairBathroomsInput}
                      onChange={(e) => setRepairBathroomsInput(e.target.value)}
                      className="w-20 text-sm px-2 py-1 border border-border rounded bg-background text-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Sqft after repair</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={repairSqftInput}
                      onChange={(e) => setRepairSqftInput(e.target.value)}
                      className="w-24 text-sm px-2 py-1 border border-border rounded bg-background text-foreground"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      className="text-sm px-3 py-1 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
                      onClick={() => {
                        const b = parseFloat(repairBedroomsInput);
                        const ba = parseFloat(repairBathroomsInput);
                        const s = parseFloat(repairSqftInput);
                        if (!isNaN(b) && b > 0) setRepairBedrooms(b);
                        if (!isNaN(ba) && ba > 0) setRepairBathrooms(ba);
                        if (!isNaN(s) && s > 0) setRepairSqft(s);
                        setShowRepairPanel(false);
                      }}
                    >
                      Apply
                    </button>
                    <button
                      className="text-sm px-3 py-1 text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                      onClick={() => {
                        setRepairBedrooms(null);
                        setRepairBathrooms(null);
                        setRepairSqft(null);
                        setRepairBedroomsInput("");
                        setRepairBathroomsInput("");
                        setRepairSqftInput("");
                        setShowRepairPanel(false);
                      }}
                    >
                      Reset to as-is
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Radius selector — highlight reflects the actual radius the
                backend ended up using (after auto-expansion), not just the
                user's clicked value. */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground" data-testid="label-radius">Radius:</span>
              {(() => {
                const effectiveRadius =
                  radiusWasExpanded && actualRadiusUsed !== null
                    ? actualRadiusUsed
                    : searchRadius;
                return ([0.5, 1, 2, 3, 5] as RadiusOption[]).map((radius) => (
                  <Button
                    key={radius}
                    type="button"
                    size="sm"
                    variant={effectiveRadius === radius ? "default" : "outline"}
                    onClick={() => {
                      const effectiveRadius = radiusWasExpanded && actualRadiusUsed !== null ? actualRadiusUsed : searchRadius;
                      if (radius !== effectiveRadius) {
                        // Capture the user's selection SYNCHRONOUSLY before any
                        // async work or state changes. We store stable address
                        // keys (compKey) — not numeric indices — so the lock
                        // survives a refetch even when the new comps array has
                        // a different length or order.
                        lockedSelectionRef.current =
                          selectedCompIndices.size >= 1
                            ? new Set(
                                Array.from(selectedCompIndices)
                                  .map((i) => compsData?.comps[i])
                                  .filter(Boolean)
                                  .map((c) => compKey(c as SoldPropertyComp)),
                              )
                            : null;
                        setSearchRadius(radius);
                        // Reset date range to default when user manually changes radius
                        // so sticky auto-expansion doesn't carry forward.
                        setSearchDateRange(180);
                        if (compsData) setTimeout(() => searchCompsWithOptions(radius, 180), 0);
                      }
                    }}
                    disabled={isSearchingComps}
                    data-testid={`button-radius-${radius}`}
                  >
                    {radius === 0.5 ? "½" : radius} mi
                  </Button>
                ));
              })()}
            </div>
            {/* Date range selector — highlight reflects the actual date range
                the backend ended up using (after auto-expansion). */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground" data-testid="label-date-range">Sales:</span>
              {(() => {
                const effectiveDateRange =
                  dateRangeWasExpanded && actualDateRangeUsed !== null
                    ? actualDateRangeUsed
                    : searchDateRange;
                return ([180, 270, 365] as DateRangeOption[]).map((days) => (
                  <Button
                    key={days}
                    type="button"
                    size="sm"
                    variant={effectiveDateRange === days ? "default" : "outline"}
                    onClick={() => {
                      if (days !== searchDateRange) {
                        lockedSelectionRef.current =
                          selectedCompIndices.size >= 1
                            ? new Set(
                                Array.from(selectedCompIndices)
                                  .map((i) => compsData?.comps[i])
                                  .filter(Boolean)
                                  .map((c) => compKey(c as SoldPropertyComp)),
                              )
                            : null;
                        setSearchDateRange(days);
                        if (compsData) setTimeout(() => searchCompsWithOptions(searchRadius, days), 0);
                      }
                    }}
                    disabled={isSearchingComps}
                    data-testid={`button-date-range-${days}`}
                  >
                    {days === 180 ? "6" : days === 270 ? "9" : "12"} mo
                  </Button>
                ));
              })()}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={searchComps}
              disabled={isSearchingComps || !city || !state}
              data-testid="button-search-comps"
            >
              {isSearchingComps ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-1.5" />
                  Search Comps
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowAddCompForm(!showAddCompForm)}
              data-testid="button-add-comp"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Comp
            </Button>
          </div>
        </div>

        {/* Add Custom Comp Form */}
        {showAddCompForm && (
          <div className="p-3 bg-muted/50 rounded-md border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Add Comp</h4>
                <p className="text-xs text-muted-foreground">
                  Paste a Zillow URL or enter the comp details manually
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowAddCompForm(false);
                  setCustomCompUrl("");
                  setCustomCompError(null);
                  setManualCompError(null);
                  setShowManualForm(false);
                }}
                data-testid="button-close-add-comp-form"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Zillow URL section */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Add from Zillow URL</Label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://www.zillow.com/homedetails/..."
                  value={customCompUrl}
                  onChange={(e) => setCustomCompUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (customCompUrl.trim() && !isAddingCustomComp) addCustomComp();
                    }
                  }}
                  className="flex-1"
                  data-testid="input-custom-comp-url"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addCustomComp}
                  disabled={isAddingCustomComp || !customCompUrl.trim()}
                  data-testid="button-add-comp-submit"
                >
                  {isAddingCustomComp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                </Button>
              </div>
              {customCompError && <p className="text-xs text-destructive">{customCompError}</p>}
            </div>

            {/* Manual entry divider */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">Or enter manually</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Manual entry section — fields are collapsed by default. The
                 toggle button below expands them and switches to "Cancel". */}
            <div className="flex justify-start">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowManualForm((v) => !v);
                  setManualCompError(null);
                }}
                data-testid="button-toggle-manual-form"
              >
                {showManualForm ? (
                  "Cancel"
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Manual Comp
                  </>
                )}
              </Button>
            </div>

            {showManualForm && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1 sm:col-span-2 md:col-span-2">
                  <Label htmlFor="manual-comp-address" className="text-xs">Street Address</Label>
                  <Input
                    id="manual-comp-address"
                    placeholder="123 Main St"
                    value={manualComp.address}
                    onChange={(e) => setManualComp({ ...manualComp, address: e.target.value })}
                    data-testid="input-manual-comp-address"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manual-comp-city" className="text-xs">City</Label>
                  <Input
                    id="manual-comp-city"
                    placeholder="City"
                    value={manualComp.city}
                    onChange={(e) => setManualComp({ ...manualComp, city: e.target.value })}
                    data-testid="input-manual-comp-city"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="manual-comp-state" className="text-xs">State</Label>
                    <Input
                      id="manual-comp-state"
                      placeholder="ST"
                      maxLength={2}
                      value={manualComp.state}
                      onChange={(e) => setManualComp({ ...manualComp, state: e.target.value.toUpperCase() })}
                      data-testid="input-manual-comp-state"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="manual-comp-zip" className="text-xs">Zip</Label>
                    <Input
                      id="manual-comp-zip"
                      placeholder="00000"
                      value={manualComp.zipCode}
                      onChange={(e) => setManualComp({ ...manualComp, zipCode: e.target.value })}
                      data-testid="input-manual-comp-zip"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="manual-comp-beds" className="text-xs">Beds</Label>
                  <Input
                    id="manual-comp-beds"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="3"
                    value={manualComp.bedrooms}
                    onChange={(e) => setManualComp({ ...manualComp, bedrooms: e.target.value })}
                    data-testid="input-manual-comp-beds"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manual-comp-baths" className="text-xs">Baths</Label>
                  <Input
                    id="manual-comp-baths"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="2"
                    value={manualComp.bathrooms}
                    onChange={(e) => setManualComp({ ...manualComp, bathrooms: e.target.value })}
                    data-testid="input-manual-comp-baths"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manual-comp-sqft" className="text-xs">Sqft</Label>
                  <Input
                    id="manual-comp-sqft"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="1500"
                    value={manualComp.sqft}
                    onChange={(e) => setManualComp({ ...manualComp, sqft: e.target.value })}
                    data-testid="input-manual-comp-sqft"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manual-comp-price" className="text-xs">Sale Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="manual-comp-price"
                      type="text"
                      placeholder="250000"
                      value={manualComp.salePrice}
                      onChange={(e) => setManualComp({ ...manualComp, salePrice: e.target.value.replace(/[^0-9.]/g, "") })}
                      className="pl-7"
                      data-testid="input-manual-comp-price"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manual-comp-date" className="text-xs">Sale Date</Label>
                  <Input
                    id="manual-comp-date"
                    type="date"
                    value={manualComp.saleDate}
                    onChange={(e) => setManualComp({ ...manualComp, saleDate: e.target.value })}
                    data-testid="input-manual-comp-date"
                  />
                </div>
              </div>

              {manualCompError && <p className="text-xs text-destructive">{manualCompError}</p>}

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={addManualComp}
                  data-testid="button-add-manual-comp-submit"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Manual Comp
                </Button>
              </div>
            </div>
            )}
          </div>
        )}

        {/* Pending Properties Section */}
        {showPendingProperties && pendingProperties.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Pending Sales ({pendingProperties.length})
                </h4>
                <p className="text-xs text-muted-foreground">
                  Properties under contract but not yet closed. Click to add as comp.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPendingProperties(false)}
                data-testid="button-close-pending"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingProperties.map((pending, index) => {
                const alreadyAdded = compsData?.comps.some(
                  (c) => c.address.toLowerCase() === pending.address.toLowerCase()
                );
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-background rounded border text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{pending.address}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                        <span>{formatCurrency(pending.salePrice)}</span>
                        <span>{pending.bedrooms}/{pending.bathrooms}</span>
                        <span>{pending.sqft.toLocaleString()} sqft</span>
                        <span>${pending.pricePerSqft}/sqft</span>
                        {pending.distanceFromSubject && (
                          <span>{pending.distanceFromSubject.toFixed(1)} mi</span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={alreadyAdded ? "secondary" : "default"}
                      onClick={() => !alreadyAdded && addPendingToComps(pending)}
                      disabled={alreadyAdded}
                      className="ml-2 shrink-0"
                      data-testid={`button-add-pending-${index}`}
                    >
                      {alreadyAdded ? "Added" : "Add"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showPendingProperties && pendingProperties.length === 0 && !isSearchingPending && (
          <div className="p-3 bg-muted/50 rounded-md border text-center text-sm text-muted-foreground">
            No pending sales found in this area.
          </div>
        )}

        {/* Search criteria summary */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="bg-muted px-2 py-1 rounded">
            <MapPin className="h-3 w-3 inline mr-1" />
            {city}, {state} {zipCode}
          </span>
          <span className={`px-2 py-1 rounded ${repairBedrooms !== null || repairBathrooms !== null ? "bg-primary/10 text-primary" : "bg-muted"}`}>
            <Home className="h-3 w-3 inline mr-1" />
            {effectiveBedrooms} bed, {effectiveBathrooms} bath
          </span>
          <span className={`px-2 py-1 rounded ${repairSqft !== null ? "bg-primary/10 text-primary" : "bg-muted"}`}>
            {effectiveSqft.toLocaleString()} sqft (±20%)
          </span>
          {propertyType && (
            <span className="bg-muted px-2 py-1 rounded">
              {propertyType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          )}
        </div>

        {/* Error message */}
        {compsError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{compsError}</div>
        )}

        {/* Auto-expansion notice — covers both radius and date-range expansion */}
        {(radiusWasExpanded || dateRangeWasExpanded) && (() => {
          const fmtRadius = (r: number) => (r === 1 ? "1 mile" : `${r} miles`);
          const fmtDate = (d: number) =>
            d === 365 ? "12 months" : d === 270 ? "9 months" : `${d} days`;
          const parts: string[] = [];
          if (radiusWasExpanded && actualRadiusUsed !== null) {
            parts.push(`radius to ${fmtRadius(actualRadiusUsed)}`);
          }
          if (dateRangeWasExpanded && actualDateRangeUsed !== null) {
            parts.push(`date range to ${fmtDate(actualDateRangeUsed)}`);
          }
          if (parts.length === 0) return null;
          const joined =
            parts.length === 1 ? parts[0] : `${parts[0]} and ${parts[1]}`;
          return (
            <p className="text-xs text-muted-foreground" data-testid="text-auto-expanded">
              Expanded {joined} to find more comps.
            </p>
          );
        })()}

        {/* Non-disclosure state messaging — 3 tiers based on comp count */}
        {compsData && isNonDisclosure && !isSearchingComps && (() => {
          const count = compsData.comps.length;
          if (count <= 1) {
            return (
              <div className="rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">{stateName} is a non-disclosure state</p>
                    <p className="text-sm text-amber-800 dark:text-amber-300">Sale prices are not publicly recorded in {stateName}. This limits both the number of comps available and the accuracy of prices shown, which may significantly affect your ARV estimate.</p>
                    <p className="text-sm text-amber-800 dark:text-amber-300">If you have comps from your realtor or MLS, use the <strong>+ Add Comp</strong> button to add them manually. The ARV Helper can still calculate your ARV and generate a branded Comp Report for {companyName}.</p>
                    <p className="text-sm text-amber-800 dark:text-amber-300"><strong>PropStream</strong> provides MLS-backed sale prices and off-market property data across all 50 states, including non-disclosure states like {stateName}.{" "}<a href={propStreamUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">Start your free 7-day trial →</a></p>
                  </div>
                </div>
              </div>
            );
          } else if (count <= 5) {
            return (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-md px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200"><strong>{stateName} is a non-disclosure state.</strong> The number of available comps and accuracy of sale prices may be limited, which could affect your ARV estimate. PropStream provides MLS-backed sale prices and off-market data for all 50 states, including non-disclosure states.{" "}<a href={propStreamUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">Start your free 7-day trial →</a></p>
              </div>
            );
          } else {
            return (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">Note: <strong>{stateName} is a non-disclosure state.</strong> Sale prices and comp availability may be limited compared to disclosure states. PropStream provides MLS-backed sale prices and off-market data for all 50 states.{" "}<a href={propStreamUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">Start your free 7-day trial →</a></p>
              </div>
            );
          }
        })()}

                {/* Message A — fewer than 3 comps were returned by the search.
             Sits in the same location the comps table would normally appear
             so the user immediately sees why the table isn't there (or why
             it's so small). Triggers only after a search has completed
             (compsData exists and we are not currently searching). */}
        {compsData &&
          compsData.comps.length < 3 &&
          !isSearchingComps && (
            <div
              className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2"
              data-testid="text-too-few-comps-message"
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Not enough comparable sales were found in this area. This is common in rural markets, areas with low sales volume, unique or luxury properties, or very new developments. Try expanding the date range or radius above, or add your own comps using + Add Comp.
                {compsData.comps.length > 0 && (
                  <>
                    {" "}However, {compsData.comps.length}{" "}
                    {compsData.comps.length === 1 ? "property was" : "properties were"} returned below — you may be able to manually select suitable comps from the list below.
                  </>
                )}
              </p>
            </div>
          )}

        {/* Comps Results */}
        {compsData && compsData.comps.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-end gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {compsData.comps.length} comp{compsData.comps.length !== 1 ? "s" : ""} found
              </span>
            </div>

            {/* Message B — many comps were returned but auto-selection
                 produced nothing. Shown above the table so the user
                 understands why nothing is pre-selected and is prompted to
                 select manually. Disappears as soon as the user selects
                 their first comp. */}
            {compsData.comps.length >= 3 &&
              selectedCompIndices.size === 0 &&
              !isSearchingComps && (
                <div
                  className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2"
                  data-testid="text-no-auto-select-warning"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {compsData.comps.length} comparable sales were found but the system could not automatically identify the best matches. This typically happens when the subject property has an unusual bed/bath count, predominantly distressed nearby sales, or a wide price spread in the area. Please manually select the comps most similar to your subject property.
                  </p>
                </div>
              )}

            {/* Insufficient selected comps warning — gated to be mutually
                 exclusive with Message A (length < 3) and Message B
                 (selected === 0). Only fires when the search returned
                 enough comps, the user has begun selecting (1 or 2 picked),
                 and the system itself flagged fewer than 3 as suitable. */}
            {compsData.comps.length >= 3 &&
              selectedCompIndices.size > 0 &&
              selectedCompIndices.size < 3 &&
              (compsData.searchStats?.suitableCount ?? 0) < 3 && (
              <div
                className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2"
                data-testid="text-insufficient-comps-warning"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Only {selectedCompIndices.size} suitable comp{selectedCompIndices.size !== 1 ? "s" : ""} found in this area. This ARV may not be reliable — consider expanding your search radius or date range, or supplement with your own comp research. Select at least one more comp from the list above, or add your own using + Add Comp, for a more reliable ARV estimate.
                </p>
              </div>
            )}

            {wideRangeWarning && (
              <div
                className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 mb-3"
                data-testid="text-wide-range-warning"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">{wideRangeWarning}</p>
              </div>
            )}

            {hasRepairOverride && compsData && (
              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2 mb-3">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Repair profile is active. Click Search Comps to update results for the modified property.
                </p>
              </div>
            )}
            {selectedArvData.count >= 2 && (
              <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Based on {selectedArvData.count} comparable sale{selectedArvData.count !== 1 ? "s" : ""}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Weighted Avg: ${selectedArvData.avgPricePerSqft || 0}/sqft × {effectiveSqft.toLocaleString()} sqft
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Suggested ARV</div>
                  <div className="text-2xl font-bold text-primary" data-testid="text-suggested-arv">
                    {selectedArvData.arv ? formatCurrency(selectedArvData.arv) : "N/A"}
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <CompReportPdf
                      subjectAddress={address}
                      subjectCity={city}
                      subjectState={state}
                      subjectZip={zipCode}
                      subjectBeds={bedrooms}
                      subjectBaths={bathrooms}
                      subjectSqft={sqft}
                      subjectYearBuilt={form.watch("yearBuilt")}
                      subjectLat={propertyLatitude}
                      subjectLng={propertyLongitude}
                      suggestedArv={selectedArvData.arv}
                      avgPricePerSqft={selectedArvData.avgPricePerSqft}
                      selectedComps={(compsData?.comps || []).filter((_, index) =>
                        selectedCompIndices.has(index)
                      )}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (selectedArvData.arv) {
                          form.setValue("arv", selectedArvData.arv);
                          form.setValue("estimatedValue", selectedArvData.arv);
                          toast({
                            title: "ARV Applied",
                            description: `Est. Market Value set to ${formatCurrency(selectedArvData.arv)}`,
                          });
                          onClose();
                        }
                      }}
                      disabled={!selectedArvData.arv}
                      data-testid="button-use-suggested-arv"
                    >
                      Use This ARV
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="w-10 cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => {
                      setCompsSortField(null);
                      setCompsSortDirection("asc");
                    }}
                    title="Show selected comps first"
                    data-testid="sort-selected-first"
                  >
                    <div className="flex items-center justify-center">
                      {compsSortField === null ? (
                        <ArrowUpDown className="h-3 w-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => toggleSort("salePrice")}
                    data-testid="sort-sale-price"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Sale Price
                      {compsSortField === "salePrice" ? (
                        compsSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => toggleSort("saleDate")}
                    data-testid="sort-sale-date"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Sold
                      {compsSortField === "saleDate" ? (
                        compsSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => toggleSort("bedBath")}
                    data-testid="sort-bed-bath"
                  >
                    <div className="flex items-center justify-center gap-1">
                      Bed/Bath
                      {compsSortField === "bedBath" ? (
                        compsSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => toggleSort("sqft")}
                    data-testid="sort-sqft"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Sqft
                      {compsSortField === "sqft" ? (
                        compsSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => toggleSort("pricePerSqft")}
                    data-testid="sort-price-per-sqft"
                  >
                    <div className="flex items-center justify-end gap-1">
                      $/Sqft
                      {compsSortField === "pricePerSqft" ? (
                        compsSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => toggleSort("distance")}
                    data-testid="sort-distance"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Distance
                      {compsSortField === "distance" ? (
                        compsSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCompsWithIndices.map(({ comp, originalIndex }) => {
                  const isFlagged = !!(comp.outlierFlag || comp.distressedFlag || (comp as any).borderlineFlag || (comp as any).cityMismatch);
                  return (
                    <>
                      <TableRow
                        key={originalIndex}
                        className={`cursor-pointer hover-elevate${isFlagged ? " opacity-75" : ""}`}
                        onClick={() =>
                          setExpandedCompIndex(expandedCompIndex === originalIndex ? null : originalIndex)
                        }
                        data-testid={`row-comp-${originalIndex}`}
                      >
                        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedCompIndices.has(originalIndex)}
                            onCheckedChange={() => {
                              setSelectedCompIndices((prev) => {
                                const newSet = new Set(prev);
                                if (newSet.has(originalIndex)) newSet.delete(originalIndex);
                                else newSet.add(originalIndex);
                                return newSet;
                              });
                            }}
                            data-testid={`checkbox-comp-${originalIndex}`}
                          />
                        </TableCell>
                        <TableCell className="w-8">
                          {expandedCompIndex === originalIndex ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-1.5">
                            {isFlagged && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {comp.outlierFlag || comp.distressedFlag ? (
                                    <AlertTriangle
                                      className="h-3.5 w-3.5 text-amber-500 flex-shrink-0"
                                      data-testid={`icon-flag-${originalIndex}`}
                                    />
                                  ) : (comp as any).borderlineFlag ? (
                                    <AlertCircle
                                      className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0"
                                      data-testid={`icon-flag-${originalIndex}`}
                                    />
                                  ) : (
                                    <Info
                                      className="h-3.5 w-3.5 text-blue-400 flex-shrink-0"
                                      data-testid={`icon-flag-${originalIndex}`}
                                    />
                                  )}
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs">
                                  {comp.distressedFlag && (
                                    <p className="mb-1 last:mb-0">Price is significantly below the area median — likely an as-is or distressed sale. Verify before using.</p>
                                  )}
                                  {comp.outlierFlag && (
                                    <p className="mb-1 last:mb-0">Price is significantly above the area median — likely a renovated sale. Verify before using.</p>
                                  )}
                                  {(comp as any).borderlineFlag && (
                                    <p className="mb-1 last:mb-0">Price may be too low or too high to be a reliable comp. Verify before using.</p>
                                  )}
                                  {(comp as any).cityMismatch && (
                                    <p className="mb-1 last:mb-0">Located in {comp.city}, not {city}. Verify before using.</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <div>
                              <div>{comp.address}</div>
                              <div className="text-xs text-muted-foreground">
                                {comp.city}, {comp.state}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(comp.salePrice)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {(comp as any).isPending ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          ) : (
                            formatDate(comp.saleDate)
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {comp.bedrooms}/{comp.bathrooms}
                        </TableCell>
                        <TableCell className="text-right text-sm">{comp.sqft.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">${comp.pricePerSqft}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {comp.distanceFromSubject !== undefined
                            ? `${comp.distanceFromSubject.toFixed(1)} mi`
                            : "—"}
                        </TableCell>
                      </TableRow>
                      {expandedCompIndex === originalIndex && (
                        <TableRow key={`${originalIndex}-details`}>
                          <TableCell colSpan={9} className="bg-muted/50 p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">
                                    {(comp as any).isPending ? "Status:" : "Sale Date:"}
                                  </span>
                                  <div className="font-medium">
                                    {(comp as any).isPending ? (
                                      <Badge
                                        variant="outline"
                                        className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                                      >
                                        <Clock className="h-3 w-3 mr-1" />
                                        Pending (List Price)
                                      </Badge>
                                    ) : (
                                      formatDate(comp.saleDate)
                                    )}
                                  </div>
                                </div>
                                {comp.yearBuilt && (
                                  <div>
                                    <span className="text-muted-foreground">Year Built:</span>
                                    <div className="font-medium">{comp.yearBuilt}</div>
                                  </div>
                                )}
                                {comp.lotSize && (
                                  <div>
                                    <span className="text-muted-foreground">Lot Size:</span>
                                    <div className="font-medium">{comp.lotSize.toLocaleString()} sqft</div>
                                  </div>
                                )}
                                {comp.propertyType && (
                                  <div>
                                    <span className="text-muted-foreground">Type:</span>
                                    <div className="font-medium">{comp.propertyType}</div>
                                  </div>
                                )}
                                {comp.similarityScore !== undefined && (
                                  <div>
                                    <span className="text-muted-foreground">Match Score:</span>
                                    <div className="font-medium">{comp.similarityScore}/100</div>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-sm">
                                  <span className="text-muted-foreground">View on Zillow:</span>
                                  <div className="font-medium">
                                    <a
                                      href={`https://www.zillow.com/homes/${encodeURIComponent(`${comp.address} ${comp.city} ${comp.state}`.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, ""))}_rb/`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline inline-flex items-center gap-1"
                                      data-testid={`link-comp-zillow-${originalIndex}`}
                                    >
                                      View Property
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog(originalIndex);
                                  }}
                                  data-testid={`button-edit-comp-${originalIndex}`}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>

            {/* PropStream callout — always visible above the ARV result.
                When a search has completed and fewer than 3 suitable comps
                were found, the card switches to a prominent amber warning
                style with a warning icon. Otherwise it uses the subtle
                default style. */}
            {(() => {
              const lowComps =
                !!compsData && (compsData.searchStats?.suitableCount ?? 0) < 3;
              return (
                <Card
                  className={`mt-3 ${
                    lowComps
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                      : "border-primary/20"
                  }`}
                  data-testid="card-propstream-permanent"
                >
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground flex items-start gap-2">
                      {lowComps && (
                        <AlertTriangle
                          className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                          data-testid="icon-propstream-warning"
                        />
                      )}
                      <span>
                        Find more comps with PropStream — 160M+ properties nationwide. PropStream gives investors access to MLS-backed sales data, off-market properties, and advanced comp tools across 160M+ properties nationwide.{" "}
                        <a
                          href="https://trial.propstreampro.com/redatametrix/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                          style={{ fontWeight: 700 }}
                          data-testid="link-propstream-permanent"
                        >
                          <strong>Start your free 7-day trial →</strong>
                        </a>
                      </span>
                    </p>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Suggested ARV */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              {/* Selection-count warnings:
                   - <2 selected: ARV cannot be calculated, action buttons disabled
                   - exactly 2 selected: ARV shown, but reliability warning */}
              {selectedCompIndices.size < 2 && (
                <div
                  className="mb-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2"
                  data-testid="text-min-comps-warning"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Select at least 2 comps to calculate an ARV estimate.
                  </p>
                </div>
              )}
              {selectedCompIndices.size === 2 && (
                <div
                  className="mb-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2"
                  data-testid="text-two-comps-warning"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Only 2 comps selected. Select or add 1 more comp for a more reliable ARV estimate.
                  </p>
                </div>
              )}


            </div>
          </div>
        )}

        {/* Empty-state message removed — Message A (above) now handles the
            < 3 comps case (which includes 0 comps), and the persistent
            Propstream callout card already provides the trial CTA. */}
      </div>

      {/* Edit Comp Dialog */}
      <Dialog open={editingCompIndex !== null} onOpenChange={(open) => !open && setEditingCompIndex(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Comparable</DialogTitle>
            <DialogDescription>
              Correct the price or property type if the data is inaccurate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Sale Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-price"
                  type="text"
                  value={editFormValues.salePrice}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    setEditFormValues((prev) => ({ ...prev, salePrice: value }));
                  }}
                  className="pl-9"
                  placeholder="Enter price"
                  data-testid="input-edit-comp-price"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-property-type">Property Type</Label>
              <Select
                value={editFormValues.propertyType}
                onValueChange={(value) =>
                  setEditFormValues((prev) => ({ ...prev, propertyType: value }))
                }
              >
                <SelectTrigger id="edit-property-type" data-testid="select-edit-comp-property-type">
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single Family">Single Family</SelectItem>
                  <SelectItem value="Townhouse">Townhouse</SelectItem>
                  <SelectItem value="Condo">Condo</SelectItem>
                  <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                  <SelectItem value="Manufactured">Manufactured</SelectItem>
                  <SelectItem value="Land">Land</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingCompIndex(null)}
              data-testid="button-cancel-edit-comp"
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveCompEdit} data-testid="button-save-edit-comp">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ArvQuotaExhaustedModal open={showArvQuotaModal} onOpenChange={setShowArvQuotaModal} isAuthenticated={isAuthenticated} />
    </>
  );
}
