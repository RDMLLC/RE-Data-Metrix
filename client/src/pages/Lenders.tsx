import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import lendersImg from "@assets/generated_images/Lenders_partnership_concept_image_281c2e15.png";

export default function Lenders() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl lg:text-6xl font-bold text-primary mb-4">Lender Network</h1>
          <div className="h-1 w-32 bg-accent mx-auto mb-8"></div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Connect with verified lenders who specialize in real estate investment financing. Search by criteria, compare options, and submit applications directly through our platform. Creative financing solutions for every deal type.
          </p>
        </div>

        {/* Search Form Preview */}
        <Card className="p-8 mb-12 bg-card/50 border-2 border-dashed">
          <h2 className="text-2xl font-semibold text-primary mb-6">Search for Lenders</h2>
          <div className="space-y-4 opacity-60 pointer-events-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Loan Type</label>
                <Input placeholder="e.g., Fix & Flip, DSCR, Bridge" disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Minimum Credit Score</label>
                <Input placeholder="e.g., 620, 680, 700" disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Property Type</label>
                <Input placeholder="e.g., Single Family, Multi-Family" disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                <Input placeholder="e.g., California, Texas" disabled />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" disabled className="rounded" />
                Deferred Interest Available
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" disabled className="rounded" />
                New Investor Friendly
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" disabled className="rounded" />
                Less Stringent Credit
              </label>
            </div>
            <Button className="w-full md:w-auto bg-accent text-accent-foreground" disabled>
              <Search className="h-4 w-4 mr-2" />
              Search Lenders
            </Button>
          </div>
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-center text-muted-foreground">
              Coming Soon - Search functionality will be available at launch
            </p>
          </div>
        </Card>

        {/* Image Preview */}
        <div className="mb-12">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg">
            <img 
              src={lendersImg} 
              alt="Lender Partnership Network"
              className="w-full h-full object-cover opacity-80"
            />
          </div>
        </div>

        {/* Call to Action */}
        <Card className="p-12 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground text-center">
          <h2 className="text-3xl font-bold mb-4">Get Early Access to Our Lender Network</h2>
          <p className="text-lg text-primary-foreground/80 mb-6 max-w-2xl mx-auto">
            Be among the first to connect with our verified lenders when we launch. Lock in your discount now!
          </p>
          <Button 
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            size="lg"
            onClick={() => window.location.href = '/'}
          >
            Lock in my Discount
          </Button>
        </Card>
      </div>
    </Layout>
  );
}
