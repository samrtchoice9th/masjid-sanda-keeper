import { useState } from "react";
import { Search, FileText, Phone, CreditCard } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function PublicLookup() {
  const [cardNumber, setCardNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [donor, setDonor] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  const handleLookup = async () => {
    if (!cardNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a card number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setNotFound(false);
    setDonor(null);
    setDonations([]);

    try {
      // Fetch donor
      const { data: donorData, error: donorError } = await supabase
        .from("donors")
        .select("*")
        .eq("card_number", cardNumber.trim())
        .maybeSingle();

      if (donorError) throw donorError;

      if (!donorData) {
        setNotFound(true);
        return;
      }

      setDonor(donorData);

      // Fetch donations
      const { data: donationsData, error: donationsError } = await supabase
        .from("donations")
        .select("*")
        .eq("donor_id", donorData.id)
        .order("date", { ascending: false });

      if (donationsError) throw donationsError;

      setDonations(donationsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch donation data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = donations.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-3xl font-bold text-foreground">Check Your Donations</h2>
            <p className="text-muted-foreground">Enter your donation card number to view your contribution history</p>
          </div>

          <Card className="mb-8 shadow-card">
            <CardHeader>
              <CardTitle>Lookup Donation Record</CardTitle>
              <CardDescription>Enter your unique card number below</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Card Number (e.g., CARD-12345)"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  className="flex-1"
                />
                <Button onClick={handleLookup} disabled={loading}>
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {notFound && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6 text-center">
                <p className="text-destructive">Card number not found. Please contact Masjid admin.</p>
              </CardContent>
            </Card>
          )}

          {donor && (
            <>
              <Card className="mb-6 shadow-card">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                  <CardTitle>Donor Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{donor.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Card Number</p>
                        <p className="font-medium">{donor.card_number}</p>
                      </div>
                    </div>
                    {donor.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{donor.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="bg-gradient-to-r from-secondary/20 to-secondary/5">
                  <CardTitle>Donation Summary</CardTitle>
                  <CardDescription>
                    Total: Rs. {totalAmount.toLocaleString()} • {donations.length} donation(s)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {donations.length === 0 ? (
                    <p className="text-center text-muted-foreground">No donations recorded yet</p>
                  ) : (
                    <div className="space-y-3">
                      {donations.map((donation) => (
                        <div
                          key={donation.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4"
                        >
                          <div>
                            <p className="font-medium">Rs. {Number(donation.amount).toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(donation.date).toLocaleDateString()} • {donation.method}
                            </p>
                            {donation.note && (
                              <p className="mt-1 text-xs text-muted-foreground">{donation.note}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
