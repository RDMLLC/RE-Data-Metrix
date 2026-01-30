import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLoanProductSchema, loanTypeEnum } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, X, Building2, Home, RefreshCw, HardHat, ArrowLeftRight, Wheat } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LoanProduct, LoanTypeEnum } from "@shared/schema";
import { useState, useEffect, useRef } from "react";

// Preprocessor for Zod that cleans numeric values before validation
// Returns: number for valid input, null for empty input, NaN for invalid input
const numericPreprocess = (val: unknown): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const cleanedStr = String(val).replace(/[$%,]/g, '').trim();
  if (cleanedStr === '') return null;
  const num = parseFloat(cleanedStr);
  // Return the number (or NaN if invalid - z.number() will reject NaN)
  return num;
};

// Custom nullable number schema that rejects NaN but allows null
const nullableNum = z.preprocess(
  numericPreprocess,
  z.union([
    z.null(),
    z.number().refine((n) => !Number.isNaN(n), { message: "Please enter a valid number" })
  ])
);

// Custom schema with preprocessing for numeric fields to allow $, %, and comma input
const loanProductFormSchema = insertLoanProductSchema.omit({ lenderId: true }).extend({
  minCreditScore: nullableNum,
  maxLtvBuy: nullableNum,
  maxLendRehab: nullableNum,
  interestRate: nullableNum,
  points: nullableNum,
  maxLoanArv: nullableNum,
  estimatedAppraisalCost: nullableNum,
  fees: nullableNum,
  costPerDraw: nullableNum,
  cashOutMaxLtv: nullableNum,
  referralLink: z.string().nullable().optional(),
  loanTermYears: nullableNum,
  minDscrRequired: nullableNum,
  maxLtcPercent: nullableNum,
  transactionalFlatFee: nullableNum,
});

const loanTypeLabels: Record<LoanTypeEnum, { label: string; icon: any; description: string }> = {
  'bridge': { 
    label: 'Bridge / Hard Money', 
    icon: Building2,
    description: 'Traditional fix & flip and bridge loans with rehab funding'
  },
  'dscr-purchase': { 
    label: 'DSCR Purchase', 
    icon: Home,
    description: 'Long-term rental loans based on property cash flow'
  },
  'dscr-refi': { 
    label: 'DSCR Refinance', 
    icon: RefreshCw,
    description: 'Refinance rental properties with optional cash-out'
  },
  'new-construction': { 
    label: 'New Construction / Ground-Up', 
    icon: HardHat,
    description: 'Ground-up construction and new build projects'
  },
  'transactional-funding': { 
    label: 'Transactional Funding', 
    icon: ArrowLeftRight,
    description: 'Short-term funding for double close wholesale transactions'
  },
  'usda': { 
    label: 'USDA Loan', 
    icon: Wheat,
    description: 'Government-backed loans for rural property purchases with no down payment'
  },
};

export default function LenderLoanProducts() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LoanProduct | null>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  const { data: loanProducts, isLoading } = useQuery<LoanProduct[]>({
    queryKey: ["/api/loan-products"],
    queryFn: async () => {
      const res = await fetch("/api/loan-products", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch loan products");
      return res.json();
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/loan-products", data);
      const result = await res.json();
      if (!res.ok) {
        // Handle Zod validation errors with details array
        if (result.details && Array.isArray(result.details)) {
          const fieldErrors = result.details.map((e: any) => 
            `${e.path?.join('.') || 'Field'}: ${e.message}`
          ).join(', ');
          throw new Error(fieldErrors || result.error || "Validation failed");
        }
        throw new Error(result.message || result.error || "Failed to add loan product");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loan-products"] });
      toast({
        title: "Product Added",
        description: "Your loan product has been added successfully.",
      });
      form.reset();
    },
    onError: (error: any) => {
      let errorMessage = "Failed to add loan product. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/loan-products/${id}`, data);
      const result = await res.json();
      if (!res.ok) {
        // Handle Zod validation errors with details array
        if (result.details && Array.isArray(result.details)) {
          const fieldErrors = result.details.map((e: any) => 
            `${e.path?.join('.') || 'Field'}: ${e.message}`
          ).join(', ');
          throw new Error(fieldErrors || result.error || "Validation failed");
        }
        throw new Error(result.message || result.error || "Failed to update loan product");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loan-products"] });
      toast({
        title: "Product Updated",
        description: "Your loan product has been updated successfully.",
      });
      setEditingProduct(null);
      form.reset();
    },
    onError: (error: any) => {
      let errorMessage = "Failed to update loan product. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/loan-products/bulk-import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors && Array.isArray(result.errors)) {
          const errorMessages = result.errors
            .slice(0, 5)
            .map((e: any) => `Row ${e.row}: ${e.error}`)
            .join('\n');
          
          toast({
            title: "CSV Import Failed",
            description: `${result.errorCount} errors found:\n${errorMessages}${result.errors.length > 5 ? '\n...' : ''}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: result.error || "Import Failed",
            description: result.message || "Failed to import CSV file.",
            variant: "destructive",
          });
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/loan-products"] });
        toast({
          title: "Import Successful",
          description: `Successfully imported ${result.count} loan products.`,
        });
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "An error occurred while uploading the file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const form = useForm<any>({
    resolver: zodResolver(loanProductFormSchema),
    defaultValues: {
      loanType: "bridge",
      productName: "",
      newInvestorOk: false,
      minCreditScore: null,
      maxLtvBuy: null,
      maxLendRehab: null,
      interestRate: null,
      interestDeferred: false,
      drawnFundsOnly: false,
      points: null,
      pointsDeferred: false,
      maxLoanArv: null,
      appraisalRequired: false,
      estimatedAppraisalCost: null,
      fees: null,
      costPerDraw: null,
      cashOutOk: false,
      cashOutMaxLtv: null,
      referralLink: "",
      isActive: true,
      loanTermYears: null,
      minDscrRequired: null,
      isLtcWeighted: false,
      maxLtcPercent: null,
      transactionalFlatFee: null,
    },
  });

  const watchLoanType = form.watch("loanType") as LoanTypeEnum;
  const watchCashOutOk = form.watch("cashOutOk");
  const watchIsLtcWeighted = form.watch("isLtcWeighted");

  const onSubmit = async (data: any) => {
    // Data is already cleaned by the Zod preprocess in loanProductFormSchema
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleEditProduct = (product: LoanProduct) => {
    setEditingProduct(product);
    form.reset({
      loanType: product.loanType || "bridge",
      productName: product.productName,
      newInvestorOk: product.newInvestorOk ?? false,
      minCreditScore: product.minCreditScore,
      maxLtvBuy: product.maxLtvBuy,
      maxLendRehab: product.maxLendRehab,
      interestRate: product.interestRate,
      interestDeferred: product.interestDeferred ?? false,
      drawnFundsOnly: product.drawnFundsOnly ?? false,
      points: product.points,
      pointsDeferred: product.pointsDeferred ?? false,
      maxLoanArv: product.maxLoanArv,
      appraisalRequired: product.appraisalRequired ?? false,
      estimatedAppraisalCost: product.estimatedAppraisalCost,
      fees: product.fees,
      costPerDraw: product.costPerDraw,
      cashOutOk: product.cashOutOk ?? false,
      cashOutMaxLtv: product.cashOutMaxLtv,
      referralLink: product.referralLink || "",
      isActive: product.isActive ?? true,
      loanTermYears: product.loanTermYears,
      minDscrRequired: product.minDscrRequired,
      isLtcWeighted: product.isLtcWeighted ?? false,
      maxLtcPercent: product.maxLtcPercent,
      transactionalFlatFee: product.transactionalFlatFee,
    });
    setTimeout(() => {
      formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    form.reset();
  };

  const getLoanTypeLabel = (type: string) => {
    return loanTypeLabels[type as LoanTypeEnum]?.label || type;
  };

  const getLoanTypeIcon = (type: string) => {
    const IconComponent = loanTypeLabels[type as LoanTypeEnum]?.icon;
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/lender-dashboard">
              <Button
                variant="outline"
                data-testid="button-back"
              >
                ← Back to Dashboard
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-4">Manage Loan Products</h1>
            <div className="h-1 w-24 bg-accent mb-4"></div>
            <p className="text-lg text-muted-foreground mb-6">
              Add and manage your loan products to make them available to investors
            </p>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => window.open('/api/loan-products/template/bridge', '_blank')}
                data-testid="button-download-bridge-template"
              >
                Fix & Flip Template
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('/api/loan-products/template/dscr', '_blank')}
                data-testid="button-download-dscr-template"
              >
                DSCR / New Construction Template
              </Button>
              <div>
                <input
                  type="file"
                  accept=".csv"
                  id="csv-upload"
                  className="hidden"
                  onChange={handleCsvUpload}
                  data-testid="input-csv-file"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('csv-upload')?.click()}
                  disabled={isUploading}
                  data-testid="button-upload-csv"
                >
                  {isUploading ? "Uploading..." : "Upload CSV"}
                </Button>
              </div>
            </div>
          </div>

          <Card 
            ref={formCardRef}
            className={`p-8 mb-8 transition-all duration-300 ${
              editingProduct 
                ? 'ring-2 ring-[#D4AF37] ring-offset-2 bg-[#D4AF37]/5' 
                : ''
            }`}
          >
            {editingProduct && (
              <div className="mb-4 p-3 bg-[#D4AF37]/20 border border-[#D4AF37] rounded-md" data-testid="banner-editing-product">
                <p className="text-sm font-medium text-[#1E3A8A]">
                  Editing: <span className="font-bold">{editingProduct.productName}</span>
                </p>
              </div>
            )}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-primary flex items-center gap-2">
                {editingProduct ? (
                  <>
                    <Pencil className="h-6 w-6" />
                    Edit Loan Product
                  </>
                ) : (
                  <>
                    <Plus className="h-6 w-6" />
                    Add New Loan Product
                  </>
                )}
              </h2>
              {editingProduct && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  data-testid="button-cancel-edit"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Edit
                </Button>
              )}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="loanType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Loan Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-loan-type">
                            <SelectValue placeholder="Select loan type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loanTypeEnum.map((type) => (
                            <SelectItem key={type} value={type}>
                              <div className="flex items-center gap-2">
                                {getLoanTypeIcon(type)}
                                <span>{getLoanTypeLabel(type)}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {watchLoanType && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {loanTypeLabels[watchLoanType]?.description}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Product Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-product-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="newInvestorOk"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">New Investor OK?</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === "true")}
                          value={field.value ? "true" : "false"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-new-investor">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minCreditScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Min Credit Score</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            placeholder="e.g. 620"
                            value={field.value ?? ""}
                            data-testid="input-min-credit-score"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="maxLtvBuy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Max Lend % (BUY)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="text"
                          data-testid="input-max-ltv-buy"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(watchLoanType === 'bridge') && (
                  <>
                    <FormField
                      control={form.control}
                      name="maxLendRehab"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Max Lend / Rehab (%)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              type="text"
                              data-testid="input-max-lend-rehab"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="drawnFundsOnly"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Drawn Funds Only</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value ? "true" : "false"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-drawn-funds">
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {watchLoanType === 'dscr-refi' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cashOutOk"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Cash-Out OK?</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value ? "true" : "false"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-cash-out-ok">
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchCashOutOk && (
                      <FormField
                        control={form.control}
                        name="cashOutMaxLtv"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Cash-Out Max LTV (%)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                type="text"
                                data-testid="input-cash-out-max-ltv"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}

                {(watchLoanType === 'dscr-purchase' || watchLoanType === 'dscr-refi') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="loanTermYears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Loan Term (Years)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-loan-term">
                                <SelectValue placeholder="Select term" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="15">15 Years</SelectItem>
                              <SelectItem value="20">20 Years</SelectItem>
                              <SelectItem value="25">25 Years</SelectItem>
                              <SelectItem value="30">30 Years</SelectItem>
                              <SelectItem value="40">40 Years</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="minDscrRequired"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Minimum DSCR Required</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              type="text"
                              data-testid="input-min-dscr"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            Minimum debt service coverage ratio (e.g., 1.0, 1.2)
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {watchLoanType === 'transactional-funding' && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Enter your fee structure for transactional funding (double close). You can charge a flat fee, points (percentage of loan), or both.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="transactionalFlatFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Flat Fee ($)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                type="text"
                                data-testid="input-transactional-flat-fee"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground mt-1">
                              Fixed dollar amount charged per transaction
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="points"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Points (%)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                type="text"
                                data-testid="input-transactional-points"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground mt-1">
                              Percentage of loan amount (e.g., 1.5 = 1.5%)
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {watchLoanType !== 'new-construction' && watchLoanType !== 'transactional-funding' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="interestRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Interest Rate (%)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                type="text"
                                data-testid="input-interest-rate"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {watchLoanType === 'bridge' && (
                        <FormField
                          control={form.control}
                          name="interestDeferred"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Interest Deferred?</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(value === "true")}
                                value={field.value ? "true" : "false"}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-interest-deferred">
                                    <SelectValue placeholder="Select option" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="true">Yes</SelectItem>
                                  <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="points"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Points</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                type="text"
                                data-testid="input-points"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {watchLoanType === 'bridge' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="pointsDeferred"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Points Deferred?</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(value === "true")}
                                value={field.value ? "true" : "false"}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-points-deferred">
                                    <SelectValue placeholder="Select option" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="true">Yes</SelectItem>
                                  <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="maxLoanArv"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Max Loan / ARV (%)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value || ""}
                                  type="text"
                                  data-testid="input-max-loan-arv"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {watchLoanType === 'bridge' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="isLtcWeighted"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Total LTC Cap?</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(value === "true")}
                                value={field.value ? "true" : "false"}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-ltc-weighted">
                                    <SelectValue placeholder="Select option" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="true">Yes</SelectItem>
                                  <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground mt-1">
                                Does your total loan cap at a percentage of total project cost?
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {watchIsLtcWeighted && (
                          <FormField
                            control={form.control}
                            name="maxLtcPercent"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground">Max LTC (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={field.value || ""}
                                    type="text"
                                    data-testid="input-max-ltc-percent"
                                  />
                                </FormControl>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Maximum loan as percentage of total cost (buy + rehab). Max 100%.
                                </p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="appraisalRequired"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Appraisal Required?</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "true")}
                              value={field.value ? "true" : "false"}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-appraisal-required">
                                  <SelectValue placeholder="Select option" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="true">Yes</SelectItem>
                                <SelectItem value="false">No</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="estimatedAppraisalCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Est. Appraisal Cost ($)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                type="text"
                                data-testid="input-appraisal-cost"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="fees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Fees (Doc prep) ($)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              type="text"
                              data-testid="input-fees"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchLoanType === 'bridge' && (
                      <FormField
                        control={form.control}
                        name="costPerDraw"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Cost per Draw ($)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                type="text"
                                data-testid="input-cost-per-draw"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}

                <div className="flex gap-4 pt-6">
                  <Button
                    type="submit"
                    className="flex-1"
                    data-testid={editingProduct ? "button-update-product" : "button-add-product"}
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  >
                    {editingProduct
                      ? updateProductMutation.isPending
                        ? "Updating..."
                        : "Update Product"
                      : createProductMutation.isPending
                      ? "Adding..."
                      : "Add Product"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={editingProduct ? handleCancelEdit : () => form.reset()}
                    data-testid="button-reset"
                  >
                    {editingProduct ? "Cancel" : "Reset Form"}
                  </Button>
                </div>
              </form>
            </Form>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-semibold text-primary mb-6">Your Loan Products</h2>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Loading loan products...</p>
              </div>
            ) : !loanProducts || loanProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No loan products added yet.</p>
                <p className="mt-2">Use the form above to add your first loan product.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {loanProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="p-6 rounded-md border bg-muted/30 hover-elevate" 
                    data-testid={`product-card-${product.id}`}
                  >
                    <div className="flex justify-between items-start mb-4 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getLoanTypeIcon(product.loanType || 'bridge')}
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {getLoanTypeLabel(product.loanType || 'bridge')}
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold text-primary" data-testid={`product-name-${product.id}`}>
                          {product.productName}
                        </h3>
                        {!product.isActive && (
                          <span className="text-sm text-muted-foreground">(Inactive)</span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                        disabled={editingProduct?.id === product.id}
                        data-testid={`button-edit-product-${product.id}`}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        {editingProduct?.id === product.id ? "Editing..." : "Edit"}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {product.newInvestorOk !== null && (
                        <div>
                          <span className="text-muted-foreground">New Investor OK:</span>
                          <span className="ml-2 font-medium">{product.newInvestorOk ? "Yes" : "No"}</span>
                        </div>
                      )}
                      {product.minCreditScore !== null && (
                        <div>
                          <span className="text-muted-foreground">Min Credit:</span>
                          <span className="ml-2 font-medium">{product.minCreditScore}</span>
                        </div>
                      )}
                      {product.interestRate !== null && (
                        <div>
                          <span className="text-muted-foreground">Interest Rate:</span>
                          <span className="ml-2 font-medium">{product.interestRate}%</span>
                        </div>
                      )}
                      {product.maxLtvBuy !== null && (
                        <div>
                          <span className="text-muted-foreground">Max LTV:</span>
                          <span className="ml-2 font-medium">{product.maxLtvBuy}%</span>
                        </div>
                      )}
                      {product.loanType === 'bridge' && (
                        <div>
                          <span className="text-muted-foreground">Max Loan ARV:</span>
                          <span className="ml-2 font-medium">
                            {product.maxLoanArv !== null ? `${product.maxLoanArv}%` : '70% (default)'}
                          </span>
                        </div>
                      )}
                      {product.points !== null && (
                        <div>
                          <span className="text-muted-foreground">Points:</span>
                          <span className="ml-2 font-medium">{product.points}</span>
                        </div>
                      )}
                      {product.loanType === 'dscr-refi' && product.cashOutOk && (
                        <div>
                          <span className="text-muted-foreground">Cash-Out:</span>
                          <span className="ml-2 font-medium">
                            Yes {product.cashOutMaxLtv ? `(Max ${product.cashOutMaxLtv}% LTV)` : ''}
                          </span>
                        </div>
                      )}
                      {(product.loanType === 'dscr-purchase' || product.loanType === 'dscr-refi') && product.loanTermYears !== null && (
                        <div>
                          <span className="text-muted-foreground">Term:</span>
                          <span className="ml-2 font-medium">{product.loanTermYears} Years</span>
                        </div>
                      )}
                      {(product.loanType === 'dscr-purchase' || product.loanType === 'dscr-refi') && product.minDscrRequired !== null && (
                        <div>
                          <span className="text-muted-foreground">Min DSCR:</span>
                          <span className="ml-2 font-medium">{product.minDscrRequired}</span>
                        </div>
                      )}
                      {product.estimatedAppraisalCost !== null && (
                        <div>
                          <span className="text-muted-foreground">Appraisal Cost:</span>
                          <span className="ml-2 font-medium">${product.estimatedAppraisalCost}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
