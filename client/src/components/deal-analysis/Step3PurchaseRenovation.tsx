import { UseFormReturn } from "react-hook-form";
import { WizardFormData } from "./DealAnalysisWizard";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingUp, HelpCircle, Calculator, Lightbulb, ChevronDown, ChevronUp, Search, Loader2, Home, MapPin, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Plus, X } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWizardData } from "@/contexts/WizardDataContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ArvQuotaExhaustedModal from "./ArvQuotaExhaustedModal";
import CompReportPdf from "./CompReportPdf";

// Interface for comparable property
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
  distanceFromSubject?: number; // Distance in miles from subject property
  listingUrl?: string; // URL to view the property listing
  isManuallyAdded?: boolean; // Flag for user-added comps
}

interface CompsSearchResponse {
  comps: SoldPropertyComp[];
  suggestedArv: number | null;
  weightedAvgPricePerSqft?: number;
  message?: string;
}

const closingTimelineOptions = [
  { value: "7-days", label: "7 days or less" },
  { value: "8-14-days", label: "8-14 days" },
  { value: "15-21-days", label: "15-21 days" },
  { value: "22-30-days", label: "22-30 days" },
  { value: "31-plus-days", label: "31+ days" },
];

interface Step3PurchaseRenovationProps {
  form: UseFormReturn<WizardFormData>;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3PurchaseRenovation({
  form,
  onNext,
  onBack,
}: Step3PurchaseRenovationProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { updatePropertyData, updateInvestorData, setCurrentStep, wizardData } = useWizardData();
  const purchasePrice = form.watch("purchasePrice") || 0;
  const rehabBudget = form.watch("rehabBudget") || 0;
  const arv = form.watch("arv") || 0;
  
  const totalProjectCost = purchasePrice + rehabBudget;
  const grossProfit = arv - totalProjectCost;
  const percentageOfArv = arv > 0 ? (totalProjectCost / arv) * 100 : 0;

  // Max Offer Calculator state
  const [showMaxOfferCalc, setShowMaxOfferCalc] = useState(false);
  const [maxArvPercent, setMaxArvPercent] = useState(70);
  const [calcArv, setCalcArv] = useState(arv || 0);
  const [calcRehabBudget, setCalcRehabBudget] = useState(rehabBudget || 0);

  // Max Offer Calculator calculations
  const maxProjectCost = calcArv * (maxArvPercent / 100);
  const maxOfferPrice = Math.round(Math.max(0, maxProjectCost - calcRehabBudget));

  // Get form values for comp search (must be declared before calculateSelectedArv)
  const city = form.watch("city") || "";
  const state = form.watch("state") || "";
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

  // Help with ARV state
  const [showArvHelper, setShowArvHelper] = useState(false);
  const [isSearchingComps, setIsSearchingComps] = useState(false);
  const [compsData, setCompsData] = useState<CompsSearchResponse | null>(null);
  const [expandedCompIndex, setExpandedCompIndex] = useState<number | null>(null);
  const [compsError, setCompsError] = useState<string | null>(null);
  type RadiusOption = 0.5 | 1 | 2 | 3;
  const [searchRadius, setSearchRadius] = useState<RadiusOption>(0.5);
  type DateRangeOption = 180 | 270 | 365; // 6, 9, or 12 months
  const [searchDateRange, setSearchDateRange] = useState<DateRangeOption>(180);
  const [selectedCompIndices, setSelectedCompIndices] = useState<Set<number>>(new Set());
  const [showArvQuotaModal, setShowArvQuotaModal] = useState(false);
  
  // Custom comp adding state
  const [showAddCompForm, setShowAddCompForm] = useState(false);
  const [customCompUrl, setCustomCompUrl] = useState("");
  const [isAddingCustomComp, setIsAddingCustomComp] = useState(false);
  const [customCompError, setCustomCompError] = useState<string | null>(null);
  
  // Comps sorting state
  type SortField = "distance" | "salePrice" | "saleDate" | "pricePerSqft" | "sqft";
  type SortDirection = "asc" | "desc";
  const [compsSortField, setCompsSortField] = useState<SortField>("distance");
  const [compsSortDirection, setCompsSortDirection] = useState<SortDirection>("asc");
  type DateFilter = "all" | "6" | "9";
  const [compsDateFilter, setCompsDateFilter] = useState<DateFilter>("all");
  
  // Calculate filter cutoff dates
  const filterCutoffDate = useMemo(() => {
    const date = new Date();
    if (compsDateFilter === "6") {
      date.setMonth(date.getMonth() - 6);
    } else if (compsDateFilter === "9") {
      date.setMonth(date.getMonth() - 9);
    }
    return date.getTime();
  }, [compsDateFilter]);
  
  // Detect outliers based on $/sqft - properties with extreme values are likely data errors
  // Uses 5x median threshold to identify obvious anomalies (multi-parcel sales, data glitches)
  const outlierDetection = useMemo(() => {
    if (!compsData || compsData.comps.length < 2) {
      return { outlierIndices: new Set<number>(), excludedComps: [] as { comp: SoldPropertyComp; originalIndex: number; reason: string }[] };
    }
    
    // Calculate median $/sqft from all comps
    const pricesPerSqft = compsData.comps.map(comp => comp.pricePerSqft).sort((a, b) => a - b);
    const midIndex = Math.floor(pricesPerSqft.length / 2);
    const medianPricePerSqft = pricesPerSqft.length % 2 === 0
      ? (pricesPerSqft[midIndex - 1] + pricesPerSqft[midIndex]) / 2
      : pricesPerSqft[midIndex];
    
    // Identify outliers: $/sqft > 5x median (obvious data errors like multi-parcel sales)
    const outlierThreshold = medianPricePerSqft * 5;
    const outlierIndices = new Set<number>();
    const excludedComps: { comp: SoldPropertyComp; originalIndex: number; reason: string }[] = [];
    
    compsData.comps.forEach((comp, index) => {
      if (comp.pricePerSqft > outlierThreshold) {
        outlierIndices.add(index);
        excludedComps.push({
          comp,
          originalIndex: index,
          reason: `$${comp.pricePerSqft.toLocaleString()}/sqft exceeds normal range (median: $${Math.round(medianPricePerSqft).toLocaleString()}/sqft)`
        });
      }
    });
    
    return { outlierIndices, excludedComps, medianPricePerSqft };
  }, [compsData]);

  // Filtered and sorted comps with original indices preserved for selection tracking
  const sortedCompsWithIndices = useMemo(() => {
    if (!compsData || !compsData.comps.length) return [];
    
    let compsWithIndices = compsData.comps.map((comp, originalIndex) => ({
      comp,
      originalIndex
    }));
    
    // Filter out outliers first
    compsWithIndices = compsWithIndices.filter(({ originalIndex }) => 
      !outlierDetection.outlierIndices.has(originalIndex)
    );
    
    // Apply date filter if not "all"
    if (compsDateFilter !== "all") {
      compsWithIndices = compsWithIndices.filter(({ comp }) => {
        const saleDate = new Date(comp.saleDate).getTime();
        return saleDate >= filterCutoffDate;
      });
    }
    
    return compsWithIndices.sort((a, b) => {
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
        case "distance":
        default:
          aVal = a.comp.distanceFromSubject ?? 999;
          bVal = b.comp.distanceFromSubject ?? 999;
          break;
      }
      
      let diff = aVal - bVal;
      
      // Secondary sort by sale date (most recent first) when primary values are equal
      if (diff === 0) {
        const aDate = new Date(a.comp.saleDate).getTime();
        const bDate = new Date(b.comp.saleDate).getTime();
        diff = bDate - aDate; // Most recent first
      }
      
      return compsSortDirection === "asc" ? diff : -diff;
    });
  }, [compsData, compsSortField, compsSortDirection, compsDateFilter, filterCutoffDate, outlierDetection]);
  
  // Toggle sort - if same field, toggle direction; if different field, set new field with default direction
  const toggleSort = (field: SortField) => {
    if (compsSortField === field) {
      setCompsSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setCompsSortField(field);
      // Default directions: distance asc, others desc (most recent, highest price first)
      setCompsSortDirection(field === "distance" ? "asc" : "desc");
    }
  };

  // Calculate ARV based on selected comps only
  // Only includes comps that are BOTH selected AND visible (pass date filter)
  const calculateSelectedArv = () => {
    if (!compsData || compsData.comps.length === 0) return { arv: null, avgPricePerSqft: null, count: 0 };
    
    // Get the set of currently visible original indices (those passing date filter)
    const visibleOriginalIndices = new Set(sortedCompsWithIndices.map(item => item.originalIndex));
    
    // Only include comps that are BOTH selected AND visible
    const selectedComps = compsData.comps.filter((_, index) => 
      selectedCompIndices.has(index) && visibleOriginalIndices.has(index)
    );
    if (selectedComps.length === 0) return { arv: null, avgPricePerSqft: null, count: 0 };

    // Weighted average: total sale prices / total sqft * subject sqft
    const totalSalePrice = selectedComps.reduce((sum, comp) => sum + comp.salePrice, 0);
    const totalSqft = selectedComps.reduce((sum, comp) => sum + comp.sqft, 0);
    const avgPricePerSqft = Math.round(totalSalePrice / totalSqft);
    const calculatedArv = Math.round(avgPricePerSqft * sqft);

    return { arv: calculatedArv, avgPricePerSqft, count: selectedComps.length };
  };

  const selectedArvData = calculateSelectedArv();

  // Search for comparable sales
  const searchComps = async () => {
    if (!city || !state) {
      toast({
        title: "Missing Location",
        description: "City and state are required to search for comparables. Please complete Step 1 first.",
        variant: "destructive",
      });
      return;
    }

    setIsSearchingComps(true);
    setCompsError(null);
    setCompsData(null);
    try {
      const response = await apiRequest("POST", "/api/comps/search", {
        address,
        city,
        state,
        zipCode,
        bedrooms,
        bathrooms,
        sqft,
        propertyType,
        subjectLat: propertyLatitude,
        subjectLng: propertyLongitude,
        radiusMiles: searchRadius,
        saleDateRangeDays: searchDateRange,
      });

      const data = await response.json();
      
      setCompsData(data);
      // Pre-select all comps
      if (data.comps && data.comps.length > 0) {
        setSelectedCompIndices(new Set(data.comps.map((_: SoldPropertyComp, i: number) => i)));
      }
    } catch (error: any) {
      console.error("Comps search error:", error);
      // Handle the error response from the API
      // apiRequest throws on non-2xx, so check if error message contains quota exceeded code
      if (error.message && error.message.includes("ARV_QUOTA_EXCEEDED")) {
        setShowArvQuotaModal(true);
      } else {
        // Try to extract a user-friendly error message
        let errorMessage = "Failed to search for comparable sales";
        try {
          // Error message format is "status: {json}"
          const jsonMatch = error.message.match(/\d+:\s*(.+)/);
          if (jsonMatch) {
            const errorData = JSON.parse(jsonMatch[1]);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          }
        } catch {
          // Use default message if parsing fails
        }
        setCompsError(errorMessage);
      }
    } finally {
      setIsSearchingComps(false);
    }
  };

  // Search comps with specific radius and/or date range (for auto-search when options change)
  const searchCompsWithOptions = async (radius: RadiusOption, dateRange: DateRangeOption) => {
    if (!city || !state) {
      return;
    }

    setIsSearchingComps(true);
    setCompsError(null);
    setCompsData(null);

    try {
      const response = await apiRequest("POST", "/api/comps/search", {
        address,
        city,
        state,
        zipCode,
        bedrooms,
        bathrooms,
        sqft,
        propertyType,
        subjectLat: propertyLatitude,
        subjectLng: propertyLongitude,
        radiusMiles: radius,
        saleDateRangeDays: dateRange,
      });

      const data = await response.json();
      
      setCompsData(data);
      if (data.comps && data.comps.length > 0) {
        setSelectedCompIndices(new Set(data.comps.map((_: SoldPropertyComp, i: number) => i)));
      }
    } catch (error: any) {
      console.error("Comps search error:", error);
      if (error.message && error.message.includes("ARV_QUOTA_EXCEEDED")) {
        setShowArvQuotaModal(true);
      } else {
        let errorMessage = "Failed to search for comparable sales";
        try {
          const jsonMatch = error.message.match(/\d+:\s*(.+)/);
          if (jsonMatch) {
            const errorData = JSON.parse(jsonMatch[1]);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          }
        } catch {
          // Use default message
        }
        setCompsError(errorMessage);
      }
    } finally {
      setIsSearchingComps(false);
    }
  };

  // Format currency helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Add custom comp from Zillow URL
  const addCustomComp = async () => {
    if (!customCompUrl.trim()) {
      setCustomCompError("Please enter a Zillow URL");
      return;
    }

    if (!customCompUrl.includes('zillow.com')) {
      setCustomCompError("Please enter a valid Zillow URL");
      return;
    }

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
        
        // Compute duplicate indices from current state snapshot (synchronous read)
        const existingComps = compsData?.comps || [];
        const duplicateIndices: number[] = [];
        existingComps.forEach((comp, index) => {
          if (comp.address.toLowerCase().trim() === newCompAddress) {
            duplicateIndices.push(index);
          }
        });

        // Add the new comp to the BEGINNING of the list (appears on top)
        setCompsData(prev => {
          if (!prev) {
            return {
              comps: [newComp],
              suggestedArv: null,
            };
          }
          return {
            ...prev,
            comps: [newComp, ...prev.comps],
          };
        });

        // Update selection synchronously: select new comp (index 0), deselect duplicates
        setSelectedCompIndices(prev => {
          const newSet = new Set<number>();
          // Add the new comp at index 0
          newSet.add(0);
          // Shift all existing selections by 1 (since new comp is at the beginning)
          // But exclude any duplicates with the same address
          prev.forEach(oldIndex => {
            const shiftedIndex = oldIndex + 1;
            // Only keep selection if it's not a duplicate of the new comp
            if (!duplicateIndices.includes(oldIndex)) {
              newSet.add(shiftedIndex);
            }
          });
          return newSet;
        });

        // Reset form
        setCustomCompUrl("");
        setShowAddCompForm(false);

        toast({
          title: "Comp Added",
          description: duplicateIndices.length > 0
            ? `${newComp.address} added. Older sale${duplicateIndices.length > 1 ? 's' : ''} for this address deselected.`
            : `${newComp.address} has been added to your comps list.`,
        });
      }
    } catch (error: any) {
      console.error("Error adding custom comp:", error);
      let errorMessage = "Failed to fetch property data";
      try {
        const jsonMatch = error.message.match(/\d+:\s*(.+)/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[1]);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        }
      } catch {
        // Use default message
      }
      setCustomCompError(errorMessage);
    } finally {
      setIsAddingCustomComp(false);
    }
  };

  // Sync ARV from form when it changes (only if calc hasn't been customized)
  useEffect(() => {
    if (arv > 0 && calcArv === 0) {
      setCalcArv(arv);
    }
  }, [arv]);

  // Sync rehab budget from form when it changes
  useEffect(() => {
    if (rehabBudget > 0 && calcRehabBudget === 0) {
      setCalcRehabBudget(rehabBudget);
    }
  }, [rehabBudget]);

  useEffect(() => {
    if (form.getValues("estimatedValue") && !form.getValues("arv")) {
      form.setValue("arv", form.getValues("estimatedValue"));
    }
  }, [form]);

  const handleSubmit = form.handleSubmit(() => {
    const projectLength = form.getValues("projectLength");
    
    const errors: string[] = [];
    
    if (!projectLength || projectLength <= 0) {
      errors.push("Project Length is required");
    }
    
    if (errors.length > 0) {
      toast({
        title: "Required Fields Missing",
        description: errors.join(". "),
        variant: "destructive",
      });
      return;
    }
    
    onNext();
  });

  const handleNavigateToRentalAnalysis = () => {
    // Save current form data to WizardDataContext before navigating
    const formData = form.getValues();
    
    updatePropertyData({
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zip: formData.zipCode,
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
      squareFootage: formData.sqft,
      purchasePrice: formData.purchasePrice,
      arv: formData.arv,
      rehabBudget: formData.rehabBudget,
      taxAssessedValue: formData.taxAssessedValue,
      annualInsurance: formData.annualInsurance,
      monthlyUtilities: formData.monthlyUtilities,
      hoaFees: formData.hoaFees,
      hoaTransferFee: formData.hoaTransferFee,
      projectLength: formData.projectLength,
      sellPrice: formData.sellPrice,
      closingCostsSellPercent: formData.closingCostsSellPercent,
      realEstateCommissionPercent: formData.realEstateCommissionPercent,
      attorneyFees: formData.attorneyFees,
      docPrepFees: formData.docPrepFees,
      titleExam: formData.titleExam,
      titleInsurance: formData.titleInsurance,
      estimatedRent: wizardData.property?.estimatedRent,
    });

    if (formData.creditScore) {
      updateInvestorData({
        creditScore: formData.creditScore,
        experienceLevel: formData.isNewInvestor ? "new" : "experienced",
      });
    }

    setLocation("/rental-analysis");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Purchase & Renovation
        </h2>
        <p className="text-muted-foreground mt-1">
          Enter your purchase price, rehab budget, and expected after-repair value
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg">Investment Details</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setShowArvHelper(!showArvHelper)}
                    data-testid="button-help-with-arv"
                  >
                    <Search className="h-4 w-4" />
                    Help with ARV
                    {showArvHelper ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                  <Popover open={showMaxOfferCalc} onOpenChange={(open) => {
                    if (open) {
                      setCalcArv(arv || 0);
                      setCalcRehabBudget(rehabBudget || 0);
                    }
                    setShowMaxOfferCalc(open);
                  }}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      data-testid="button-max-offer-calc"
                    >
                      <Lightbulb className="h-4 w-4" />
                      Max Offer Calculator
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 sm:w-96" align="end">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Help Determine Max Offer Price</h4>
                        <p className="text-xs text-muted-foreground">
                          Calculate your maximum purchase price based on ARV percentage and rehab costs
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="calcArv" className="text-xs font-medium">ARV</Label>
                          <Input
                            id="calcArv"
                            type="number"
                            min="0"
                            step="1"
                            value={calcArv || ""}
                            onChange={(e) => setCalcArv(parseFloat(e.target.value) || 0)}
                            placeholder="Enter ARV"
                            className="mt-1"
                            data-testid="input-calc-arv"
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxArvPercent" className="text-xs font-medium flex items-center gap-1">
                            Max % of ARV
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>The 70% rule is common for fix & flip. Your total project cost (purchase + rehab) should not exceed this percentage of ARV.</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              id="maxArvPercent"
                              type="number"
                              min="1"
                              max="100"
                              step="1"
                              value={maxArvPercent}
                              onChange={(e) => setMaxArvPercent(parseFloat(e.target.value) || 70)}
                              className="w-20"
                              data-testid="input-max-arv-percent"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium">Max Project Cost:</span>
                          <span className="text-sm font-semibold text-primary" data-testid="text-max-project-cost">
                            {formatCurrency(maxProjectCost)}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="calcRehabBudget" className="text-xs font-medium">Rehab Budget</Label>
                            <Input
                              id="calcRehabBudget"
                              type="number"
                              min="0"
                              step="1"
                              value={calcRehabBudget || ""}
                              onChange={(e) => setCalcRehabBudget(parseFloat(e.target.value) || 0)}
                              placeholder="Enter rehab budget"
                              className="mt-1"
                              data-testid="input-calc-rehab-budget"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium">Max Offer/Purchase Price</Label>
                            <div 
                              className="mt-1 p-2 bg-primary/10 border-2 border-primary rounded-md text-base font-bold text-primary"
                              data-testid="text-max-offer-price"
                            >
                              {formatCurrency(maxOfferPrice)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => {
                            form.setValue("purchasePrice", maxOfferPrice);
                            if (calcArv > 0) {
                              form.setValue("arv", calcArv);
                            }
                            if (calcRehabBudget > 0) {
                              form.setValue("rehabBudget", calcRehabBudget);
                            }
                            toast({
                              title: "Values Applied",
                              description: `ARV: ${formatCurrency(calcArv)}, Rehab: ${formatCurrency(calcRehabBudget)}, Purchase: ${formatCurrency(maxOfferPrice)}`,
                            });
                            setShowMaxOfferCalc(false);
                          }}
                          disabled={maxOfferPrice <= 0}
                          data-testid="button-use-max-offer"
                        >
                          Use This Offer Price
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowMaxOfferCalc(false)}
                          data-testid="button-close-calc"
                        >
                          Close
                        </Button>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto text-xs text-primary hover:text-primary/80"
                          onClick={() => {
                            setShowMaxOfferCalc(false);
                            setShowArvHelper(true);
                          }}
                          data-testid="button-open-arv-from-calc"
                        >
                          Need help determining ARV? Search for comps
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                </div>
              </div>
              <CardDescription>
                Enter the key financial details for this deal
              </CardDescription>
            </CardHeader>

            {/* PropStream Affiliate Promotion - shown at top when comps are found */}
            {compsData && compsData.comps.length > 0 && (
              <div className="mx-6 mb-4 p-3 bg-muted/50 rounded-md border border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    Our quick comps search is perfect for initial analysis. For full MLS data, skip tracing, and the tools top investors rely on, try PropStream — trusted by over 100,000 real estate professionals.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="shrink-0"
                    onClick={() => window.open("https://trial.propstreampro.com/redatametrix/", "_blank")}
                    data-testid="button-propstream-trial"
                  >
                    Get 7 Days Free
                  </Button>
                </div>
              </div>
            )}

            {/* Help with ARV Collapsible Section */}
            <Collapsible open={showArvHelper} onOpenChange={setShowArvHelper}>
              <CollapsibleContent className="px-6 pb-4">
                <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Find Comparable Sales</h4>
                      <p className="text-xs text-muted-foreground">
                        Search for recently sold properties similar to yours to estimate ARV
                      </p>
                      {/* Property Details Bar - Subject Property info with Zillow link */}
                      {address && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground bg-muted/50 rounded-md px-3 py-2 mt-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground">{address}, {city}, {state} {zipCode}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {bedrooms && bathrooms && (
                              <span className="flex items-center gap-1">
                                <Home className="h-3 w-3" />
                                {bedrooms}/{bathrooms}
                              </span>
                            )}
                            {sqft && (
                              <span className="flex items-center gap-1">
                                {sqft.toLocaleString()} sqft
                              </span>
                            )}
                            {yearBuilt && (
                              <span className="flex items-center gap-1">
                                {yearBuilt}
                              </span>
                            )}
                            {lotSize && (
                              <span className="flex items-center gap-1">
                                {lotSize.toLocaleString()} sqft lot
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              const zillowAddress = `${address} ${city} ${state} ${zipCode}`.replace(/\s+/g, '-').replace(/[,#]/g, '');
                              window.open(`https://www.zillow.com/homes/${encodeURIComponent(zillowAddress)}_rb/`, "_blank");
                            }}
                            data-testid="button-view-subject-zillow"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View on Zillow
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Radius selector */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground" data-testid="label-radius">Radius:</span>
                        {([0.5, 1, 2, 3] as RadiusOption[]).map((radius) => (
                          <Button
                            key={radius}
                            type="button"
                            size="sm"
                            variant={searchRadius === radius ? "default" : "outline"}
                            onClick={() => {
                              if (radius !== searchRadius) {
                                setSearchRadius(radius);
                                // Auto-search with new radius if we already have results
                                if (compsData) {
                                  setTimeout(() => {
                                    searchCompsWithOptions(radius, searchDateRange);
                                  }, 0);
                                }
                              }
                            }}
                            disabled={isSearchingComps}
                            data-testid={`button-radius-${radius}`}
                          >
                            {radius === 0.5 ? "½" : radius} mi
                          </Button>
                        ))}
                      </div>
                      {/* Date range selector */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground" data-testid="label-date-range">Sales:</span>
                        {([180, 270, 365] as DateRangeOption[]).map((days) => (
                          <Button
                            key={days}
                            type="button"
                            size="sm"
                            variant={searchDateRange === days ? "default" : "outline"}
                            onClick={() => {
                              if (days !== searchDateRange) {
                                setSearchDateRange(days);
                                // Auto-search with new date range if we already have results
                                if (compsData) {
                                  setTimeout(() => {
                                    searchCompsWithOptions(searchRadius, days);
                                  }, 0);
                                }
                              }
                            }}
                            disabled={isSearchingComps}
                            data-testid={`button-date-range-${days}`}
                          >
                            {days === 180 ? "6" : days === 270 ? "9" : "12"} mo
                          </Button>
                        ))}
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
                    <div className="p-3 bg-muted/50 rounded-md border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium">Add Comp from Zillow</h4>
                          <p className="text-xs text-muted-foreground">Paste a Zillow property URL to add it as a comparable</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setShowAddCompForm(false);
                            setCustomCompUrl("");
                            setCustomCompError(null);
                          }}
                          data-testid="button-close-add-comp-form"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="url"
                          placeholder="https://www.zillow.com/homedetails/..."
                          value={customCompUrl}
                          onChange={(e) => setCustomCompUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (customCompUrl.trim() && !isAddingCustomComp) {
                                addCustomComp();
                              }
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
                          {isAddingCustomComp ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Add"
                          )}
                        </Button>
                      </div>
                      {customCompError && (
                        <p className="text-xs text-destructive">{customCompError}</p>
                      )}
                    </div>
                  )}

                  {/* Search criteria summary */}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="bg-muted px-2 py-1 rounded">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {city}, {state} {zipCode}
                    </span>
                    <span className="bg-muted px-2 py-1 rounded">
                      <Home className="h-3 w-3 inline mr-1" />
                      {bedrooms} bed, {bathrooms} bath
                    </span>
                    <span className="bg-muted px-2 py-1 rounded">
                      {sqft.toLocaleString()} sqft (±20%)
                    </span>
                    {propertyType && (
                      <span className="bg-muted px-2 py-1 rounded">
                        {propertyType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    )}
                  </div>

                  {/* Error message */}
                  {compsError && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                      {compsError}
                    </div>
                  )}


                  {/* Comps Results */}
                  {compsData && compsData.comps.length > 0 && (
                    <div className="space-y-3">
                      {/* Filter controls */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant={compsDateFilter === "6" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCompsDateFilter(compsDateFilter === "6" ? "all" : "6")}
                            data-testid="button-filter-6-months"
                          >
                            Last 6 Months
                          </Button>
                          <Button
                            type="button"
                            variant={compsDateFilter === "9" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCompsDateFilter(compsDateFilter === "9" ? "all" : "9")}
                            data-testid="button-filter-9-months"
                          >
                            Last 9 Months
                          </Button>
                          {compsDateFilter !== "all" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setCompsDateFilter("all")}
                              data-testid="button-filter-all"
                            >
                              Show All
                            </Button>
                          )}
                          {compsDateFilter !== "all" && sortedCompsWithIndices.length === 0 && (
                            <span className="text-sm text-amber-600">
                              No comps in selected range - try a longer timeframe
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm text-muted-foreground">
                            Showing {sortedCompsWithIndices.length} of {compsData.comps.length} comps
                            {outlierDetection.excludedComps.length > 0 && (
                              <span className="text-amber-600"> ({outlierDetection.excludedComps.length} excluded)</span>
                            )}
                          </span>
                          {outlierDetection.excludedComps.length > 0 && (
                            <span className="text-xs text-amber-600" data-testid="text-outliers-excluded">
                              Data anomaly: {outlierDetection.excludedComps[0].comp.address.split(',')[0]}
                              {outlierDetection.excludedComps.length > 1 && ` +${outlierDetection.excludedComps.length - 1} more`}
                            </span>
                          )}
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
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
                            <TableHead className="text-center">Bed/Bath</TableHead>
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
                          {sortedCompsWithIndices.map(({ comp, originalIndex }) => (
                            <>
                              <TableRow 
                                key={originalIndex}
                                className="cursor-pointer hover-elevate"
                                onClick={() => setExpandedCompIndex(expandedCompIndex === originalIndex ? null : originalIndex)}
                                data-testid={`row-comp-${originalIndex}`}
                              >
                                <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedCompIndices.has(originalIndex)}
                                    onCheckedChange={() => {
                                      setSelectedCompIndices(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(originalIndex)) {
                                          newSet.delete(originalIndex);
                                        } else {
                                          newSet.add(originalIndex);
                                        }
                                        return newSet;
                                      });
                                    }}
                                    data-testid={`checkbox-comp-${originalIndex}`}
                                  />
                                </TableCell>
                                <TableCell className="w-8">
                                  {expandedCompIndex === originalIndex ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </TableCell>
                                <TableCell className="font-medium text-sm">
                                  <div>{comp.address}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {comp.city}, {comp.state}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-semibold text-primary">
                                  {formatCurrency(comp.salePrice)}
                                </TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground">
                                  {formatDate(comp.saleDate)}
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {comp.bedrooms}/{comp.bathrooms}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {comp.sqft.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  ${comp.pricePerSqft}
                                </TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground">
                                  {comp.distanceFromSubject !== undefined 
                                    ? `${comp.distanceFromSubject.toFixed(1)} mi`
                                    : '—'}
                                </TableCell>
                              </TableRow>
                              {expandedCompIndex === originalIndex && (
                                <TableRow key={`${originalIndex}-details`}>
                                  <TableCell colSpan={9} className="bg-muted/50 p-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Sale Date:</span>
                                        <div className="font-medium">{formatDate(comp.saleDate)}</div>
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
                                      {comp.daysOnMarket && (
                                        <div>
                                          <span className="text-muted-foreground">Days on Market:</span>
                                          <div className="font-medium">{comp.daysOnMarket}</div>
                                        </div>
                                      )}
                                      <div>
                                        <span className="text-muted-foreground">View on Zillow:</span>
                                        <div className="font-medium">
                                          <a 
                                            href={`https://www.zillow.com/homes/${encodeURIComponent(`${comp.address} ${comp.city} ${comp.state}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, ''))}_rb/`}
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
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Suggested ARV */}
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Based on {selectedArvData.count} comparable sale{selectedArvData.count !== 1 ? 's' : ''}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Weighted Avg: ${selectedArvData.avgPricePerSqft || 0}/sqft × {sqft.toLocaleString()} sqft
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Suggested ARV</div>
                            <div className="text-2xl font-bold text-primary" data-testid="text-suggested-arv">
                              {selectedArvData.arv ? formatCurrency(selectedArvData.arv) : 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <CompReportPdf
                            subjectAddress={address}
                            subjectCity={city}
                            subjectState={state}
                            subjectZip={zipCode}
                            subjectBeds={bedrooms}
                            subjectBaths={bathrooms}
                            subjectSqft={sqft}
                            subjectYearBuilt={form.watch("yearBuilt")}
                            suggestedArv={selectedArvData.arv}
                            avgPricePerSqft={selectedArvData.avgPricePerSqft}
                            selectedComps={(compsData?.comps || []).filter((_, index) => selectedCompIndices.has(index))}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (selectedArvData.arv) {
                                form.setValue("arv", selectedArvData.arv);
                                setCalcArv(selectedArvData.arv);
                                toast({
                                  title: "ARV Applied",
                                  description: `Est. Market Value set to ${formatCurrency(selectedArvData.arv)}`,
                                });
                                setShowArvHelper(false);
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

                  {/* No results message */}
                  {compsData && compsData.comps.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground" data-testid="text-no-comps-message">
                      <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{compsData.message || "No comparable sales found in this area."}</p>
                      {searchRadius < 3 ? (
                        <p className="text-xs mt-1">
                          Try expanding the search radius to {searchRadius === 0.5 ? "1 mile" : searchRadius === 1 ? "2 miles" : "3 miles"} to find more comps.
                        </p>
                      ) : (
                        <p className="text-xs mt-1">Try adjusting the property details or search in a nearby area.</p>
                      )}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Enter purchase price"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-purchase-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rehabBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rehab Budget</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Enter rehab budget"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-rehab-budget"
                        />
                      </FormControl>
                      <FormMessage />
                      {rehabBudget > 0 && sqft > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Rehab $/SqFt: ${(rehabBudget / sqft).toFixed(2)}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDoubleClose"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(checked) => {
                            field.onChange(checked === true);
                            if (checked !== true) {
                              form.setValue("payingForBothSides", false);
                            }
                          }}
                          data-testid="checkbox-double-close"
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Click Here if Double Close
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("isDoubleClose") === true && (
                <FormField
                  control={form.control}
                  name="payingForBothSides"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Are you paying for both transactions?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(value === "yes")}
                          value={field.value === true ? "yes" : field.value === false ? "no" : ""}
                          className="flex gap-4"
                          data-testid="radio-paying-both-sides"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="paying-both-yes" data-testid="radio-paying-both-yes" />
                            <Label htmlFor="paying-both-yes">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="paying-both-no" data-testid="radio-paying-both-no" />
                            <Label htmlFor="paying-both-no">No</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
                <FormField
                  control={form.control}
                  name="arv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-sm">
                        Est. Market Value
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>The estimated market value is based on Rentcast Data. It may or may not represent improved properties. Do your own research.</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Enter estimated market value"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          data-testid="input-arv"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Length (mo)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="60"
                          step="1"
                          placeholder="Months"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : undefined
                            )
                          }
                          data-testid="input-project-length"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="closingTimeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Close Speed</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        data-testid="select-closing-timeline"
                      >
                        <FormControl>
                          <SelectTrigger data-testid="button-closing-timeline">
                            <SelectValue placeholder="Select timeline" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {closingTimelineOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              data-testid={`option-closing-${option.value}`}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
              <CardDescription>
                Calculated metrics for this deal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Project Cost:</span>
                <span className="text-lg font-semibold" data-testid="text-total-project-cost">
                  {formatCurrency(totalProjectCost)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Expected ARV:</span>
                <span className="text-lg font-semibold" data-testid="text-expected-arv">
                  {formatCurrency(arv)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Gross Profit:</span>
                <span 
                  className={`text-lg font-semibold ${grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                  data-testid="text-gross-profit"
                >
                  {formatCurrency(grossProfit)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Percentage of ARV:</span>
                <span className="text-lg font-semibold" data-testid="text-percentage-arv">
                  {percentageOfArv.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <div className="flex gap-3 justify-between flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                data-testid="button-back"
              >
                Back
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const formData = form.getValues();
                    // Save ALL form data to context before navigating
                    updatePropertyData({
                      address: formData.address,
                      city: formData.city,
                      state: formData.state,
                      zip: formData.zipCode,
                      bedrooms: formData.bedrooms,
                      bathrooms: formData.bathrooms,
                      squareFootage: formData.sqft,
                      purchasePrice: formData.purchasePrice,
                      arv: formData.arv,
                      rehabBudget: formData.rehabBudget,
                      taxAssessedValue: formData.taxAssessedValue,
                      annualInsurance: formData.annualInsurance,
                      monthlyUtilities: formData.monthlyUtilities,
                      hoaFees: formData.hoaFees,
                      hoaTransferFee: formData.hoaTransferFee,
                      projectLength: formData.projectLength,
                      sellPrice: formData.sellPrice,
                      closingCostsSellPercent: formData.closingCostsSellPercent,
                      realEstateCommissionPercent: formData.realEstateCommissionPercent,
                      attorneyFees: formData.attorneyFees,
                      docPrepFees: formData.docPrepFees,
                      titleExam: formData.titleExam,
                      titleInsurance: formData.titleInsurance,
                    });
                    setCurrentStep(3);
                    setLocation("/deal-analysis/wholesale-calculator");
                  }}
                  data-testid="button-wholesale-calculator"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate Wholesale Max Offer Price
                </Button>
                <Button type="submit" data-testid="button-continue">
                  Continue to Investor Information
                </Button>
              </div>
            </div>
            
            {purchasePrice > 0 && arv > 0 && (
              <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                        Planning to Keep as Rental?
                      </h3>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                        Analyze this property's rental income potential, calculate DSCR (Debt Service Coverage Ratio), and find DSCR lenders.
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        onClick={handleNavigateToRentalAnalysis}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        data-testid="button-rental-analysis"
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Analyze as Rental Property
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </form>
      </Form>
      
      <ArvQuotaExhaustedModal
        open={showArvQuotaModal}
        onOpenChange={setShowArvQuotaModal}
      />
    </div>
  );
}
