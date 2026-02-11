import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useContractorAuth } from "@/contexts/ContractorAuthContext";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Loader2, FileSignature, CheckCircle2, ScrollText } from "lucide-react";

export default function ContractorAgreement() {
  const [, setLocation] = useLocation();
  const { contractor, isLoading: authLoading, isAuthenticated } = useContractorAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (contractor) {
      if (contractor.agreementSignedAt) {
        setLocation("/contractor-portal");
      }
      if (contractor.name) setSignerName(contractor.name);
      if (contractor.companyName) setCompanyName(contractor.companyName);
    }
  }, [contractor, setLocation]);

  const signMutation = useMutation({
    mutationFn: async (data: { signerName: string; signerTitle: string; companyName: string }) => {
      const res = await apiRequest("POST", "/api/contractors/sign-agreement", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to sign agreement");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/me"] });
      toast({ title: "Agreement Signed", description: "Thank you for signing the Contractor Referral Agreement." });
      setTimeout(() => setLocation("/contractor-portal"), 1000);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSign = () => {
    if (!signerName.trim()) {
      toast({ title: "Required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    if (!signerTitle.trim()) {
      toast({ title: "Required", description: "Please enter your title.", variant: "destructive" });
      return;
    }
    if (!companyName.trim()) {
      toast({ title: "Required", description: "Please enter your company name.", variant: "destructive" });
      return;
    }
    if (!agreed) {
      toast({ title: "Required", description: "Please confirm that you have read and agree to the terms.", variant: "destructive" });
      return;
    }
    signMutation.mutate({ signerName: signerName.trim(), signerTitle: signerTitle.trim(), companyName: companyName.trim() });
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated || !contractor) return null;

  return (
    <Layout>
      <div className="min-h-[calc(100vh-16rem)] py-16 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary" data-testid="text-agreement-title">
              Contractor Referral Agreement
            </h1>
            <div className="h-1 w-24 bg-accent mt-2"></div>
            <p className="text-muted-foreground mt-2">
              Please review and sign the agreement below to continue to your portal.
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Agreement Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-y-auto pr-2 space-y-6 text-sm leading-relaxed" data-testid="agreement-content">
                <p className="text-center font-bold text-base">CONTRACTOR REFERRAL AGREEMENT</p>

                <p>
                  This <strong>Contractor Referral Agreement</strong> ("Agreement") is entered into by and between <strong>RE Data Metrix, LLC</strong> ("RDM") and the undersigned <strong>Contractor</strong> (collectively, the "Parties"), effective as of the date of the last signature below.
                </p>

                <div>
                  <p className="font-bold mb-1">1. Purpose</p>
                  <p>
                    RDM agrees to list Contractor on RDM's website for the purpose of referring the Contractor to users of RDM's platform ("Users"). This listing is provided at no charge to the Contractor.
                  </p>
                </div>

                <div>
                  <p className="font-bold mb-1">2. Referral Fees</p>
                  <p>If a User hires the Contractor following a referral by RDM, the Contractor agrees to pay RDM a referral fee as follows:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>For jobs valued at <strong>$50,000 or more</strong>: <strong>$1,000</strong>.</li>
                    <li>For jobs valued at <strong>up to $49,999</strong>: <strong>$500</strong>.</li>
                  </ul>
                  <p className="mt-2">
                    Payment shall be made via <strong>ACH, wire transfer</strong>, or another mutually agreed method. All fees are due <strong>within two (2) business days</strong> of the execution of a contract or agreement between the Contractor and the referred User.
                  </p>
                </div>

                <div>
                  <p className="font-bold mb-1">3. Residual Referral Fees and First Contract Date</p>
                  <p>
                    For purposes of this Agreement, the <strong>"First Contract Date"</strong> means the date on which the first written contract or agreement between the Contractor and a referred User is executed.
                  </p>
                  <p className="mt-2">
                    Contractor acknowledges that RDM is referring a client relationship, not a single project. Therefore, additional referral fees are due for future contracts between the Contractor and the same User as follows, measured from the First Contract Date:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>For contracts or agreements executed <strong>on or before the 12-month anniversary of the First Contract Date</strong> ("Year One"): <strong>50% of the initial referral fee</strong> (i.e., $500 for jobs &ge; $50,000; $250 for jobs &le; $49,999).</li>
                    <li>For contracts or agreements executed <strong>after the 12-month anniversary but on or before the 24-month anniversary of the First Contract Date</strong> ("Year Two"): <strong>50% of the Year One residual fee</strong> (i.e., $250 for jobs &ge; $50,000; $125 for jobs &le; $49,999).</li>
                  </ul>
                  <p className="mt-2">
                    No referral fees are due for contracts executed <strong>after the 24-month anniversary of the First Contract Date</strong>.
                  </p>
                  <p className="mt-2">
                    For all purposes under this Section, the relevant date is the <strong>execution date of the contract or agreement</strong>, not the date work begins or is completed.
                  </p>
                </div>

                <div>
                  <p className="font-bold mb-1">4. Reporting and Payment Responsibility</p>
                  <p>
                    The Contractor is responsible for reporting all qualifying contracts with referred Users and for submitting the appropriate referral payments. Reporting of referrals will be available via the <strong>Contractor Portal provided by RDM</strong>, or by request directly from RDM.
                  </p>
                  <p className="mt-2">
                    RDM has no independent means of tracking such activity; therefore, the Contractor must ensure timely reporting and payment in accordance with this Agreement.
                  </p>
                </div>

                <div>
                  <p className="font-bold mb-1">5. Compliance and Enforcement</p>
                  <p>
                    The Contractor agrees not to engage in any workarounds, side arrangements, or other methods intended to avoid the payment of fees owed to RDM.
                  </p>
                  <p className="mt-2">
                    Failure to comply with this Agreement will result in removal from RDM's referral program and may result in legal action. RDM reserves the right to recover any unpaid fees, as well as reasonable attorney's fees, court costs, or other expenses incurred in the enforcement of this Agreement.
                  </p>
                </div>

                <div>
                  <p className="font-bold mb-1">6. Term and Termination</p>
                  <p>
                    This Agreement shall remain in effect until terminated. Either Party may terminate this Agreement upon <strong>thirty (30) days' written notice</strong> to the other Party.
                  </p>
                </div>

                <div>
                  <p className="font-bold mb-1">7. Effect of Termination on Existing Referrals</p>
                  <p>
                    a. <strong>Survival of Referral Fee Obligations.</strong> Contractor's obligation to pay referral fees shall survive termination of this Agreement with respect to any User that was referred to Contractor by RDM on or before the effective date of termination, whether or not Contractor and such User have entered into a contract as of the termination date.
                  </p>
                  <p className="mt-2">
                    b. <strong>Existing Referred Users.</strong> For each such referred User, all applicable referral fees (initial referral job fee, Year One residual fees, and Year Two residual fees) shall remain payable in accordance with Sections 2 and 3 for any qualifying contracts or agreements executed within the relevant time periods, measured from the First Contract Date for that User.
                  </p>
                  <p className="mt-2">
                    c. <strong>No New Referrals After Termination.</strong> After the effective date of termination, RDM shall have no obligation to provide new referrals to Contractor, and Contractor shall have no obligation to pay referral fees for Users first referred after the effective date of termination.
                  </p>
                </div>

                <div>
                  <p className="font-bold mb-1">8. Entire Agreement</p>
                  <p>
                    This Agreement constitutes the entire understanding between the Parties regarding the referral relationship and supersedes any prior agreements, oral or written, relating to this subject matter.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Electronic Signature
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="signer-name">Full Name</Label>
                    <Input
                      id="signer-name"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Your full legal name"
                      data-testid="input-signer-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your company name"
                      data-testid="input-company-name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="signer-title">Title / Authorized Signer</Label>
                  <Input
                    id="signer-title"
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    placeholder="e.g., Owner, President, Managing Member"
                    data-testid="input-signer-title"
                  />
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <Checkbox
                    id="agree-terms"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked === true)}
                    data-testid="checkbox-agree"
                  />
                  <label htmlFor="agree-terms" className="text-sm leading-snug cursor-pointer">
                    I have read the Contractor Referral Agreement above, and I agree to all terms and conditions. I understand that by clicking "Sign Agreement" below, I am electronically signing this agreement.
                  </label>
                </div>

                <div className="flex items-center gap-4 pt-2 flex-wrap">
                  <Button
                    onClick={handleSign}
                    disabled={signMutation.isPending || !agreed || !signerName.trim() || !signerTitle.trim() || !companyName.trim()}
                    data-testid="button-sign-agreement"
                  >
                    {signMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Sign Agreement
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Agreement Version 1.0
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
