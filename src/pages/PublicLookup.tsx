import { useState, useEffect } from "react";
import { FileText, Phone, CreditCard, CheckCircle, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function PublicLookup() {
  const [selectedRoot, setSelectedRoot] = useState("");
  const [selectedCardNumber, setSelectedCardNumber] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [donor, setDonor] = useState<any>(null);
  const [allDonors, setAllDonors] = useState<any[]>([]);
  const [filteredDonors, setFilteredDonors] = useState<any[]>([]);
  const [paidMonths, setPaidMonths] = useState<number[]>([]);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Fetch all donors on mount
  useEffect(() => {
    fetchAllDonors();
  }, []);

  const fetchAllDonors = async () => {
    try {
      const { data, error } = await supabase
        .from("donors")
        .select("*")
        .order("card_number");

      if (error) throw error;
      setAllDonors(data || []);
    } catch (error: any) {
      console.error("Error fetching donors:", error);
    }
  };

  // Filter donors by root
  useEffect(() => {
    if (selectedRoot) {
      const filtered = allDonors.filter(d => d.root_no === selectedRoot);
      setFilteredDonors(filtered);
    } else {
      setFilteredDonors([]);
    }
    setSelectedCardNumber("");
    setDonor(null);
    setPaidMonths([]);
  }, [selectedRoot, allDonors]);

  // Fetch donor details when card is selected
  useEffect(() => {
    if (selectedCardNumber) {
      handleCardSelection();
    } else {
      setDonor(null);
      setPaidMonths([]);
    }
  }, [selectedCardNumber]);

  // Fetch paid months when year is selected
  useEffect(() => {
    if (selectedYear && donor) {
      fetchPaidMonths();
    } else {
      setPaidMonths([]);
    }
  }, [selectedYear, donor]);

  const handleCardSelection = async () => {
    setLoading(true);
    setNotFound(false);

    try {
      const { data: donorData, error: donorError } = await supabase
        .from("donors")
        .select("*")
        .eq("card_number", selectedCardNumber)
        .maybeSingle();

      if (donorError) throw donorError;

      if (!donorData) {
        setNotFound(true);
        return;
      }

      setDonor(donorData);
    } catch (error: any) {
      console.error("Error fetching donor:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch donor data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPaidMonths = async () => {
    if (!donor || !selectedYear) return;

    try {
      const { data, error } = await supabase
        .from("donations")
        .select("months_paid")
        .eq("donor_id", donor.id)
        .eq("year", parseInt(selectedYear))
        .eq("method", "sanda");

      if (error) throw error;

      // Flatten all paid months
      const allPaidMonths: number[] = [];
      data?.forEach(donation => {
        if (donation.months_paid) {
          allPaidMonths.push(...donation.months_paid);
        }
      });

      setPaidMonths([...new Set(allPaidMonths)].sort((a, b) => a - b));
    } catch (error: any) {
      console.error("Error fetching paid months:", error);
    }
  };

  const unpaidMonths = Array.from({ length: 12 }, (_, i) => i + 1).filter(
    month => !paidMonths.includes(month)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-3xl font-bold text-foreground">Check Your Sanda</h2>
            <p className="text-muted-foreground">Select your root and card number to view your payment history</p>
          </div>

          <Card className="mb-8 shadow-card">
            <CardHeader>
              <CardTitle>Lookup Sanda Record</CardTitle>
              <CardDescription>Select your root number and card number below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Root No.</label>
                <Select value={selectedRoot} onValueChange={setSelectedRoot}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Root No." />
                  </SelectTrigger>
                  <SelectContent>
                    {["Root-1", "Root-2", "Root-3", "Root-4", "Root-5", "Root-6"].map(root => (
                      <SelectItem key={root} value={root}>{root}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRoot && (
                <div>
                  <label className="mb-2 block text-sm font-medium">Card No.</label>
                  <Select value={selectedCardNumber} onValueChange={setSelectedCardNumber}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Card No." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDonors.map(donor => (
                        <SelectItem key={donor.id} value={donor.card_number}>
                          {donor.card_number} - {donor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly Sanda Amount</p>
                        <p className="font-medium">Rs. {donor.monthly_sanda_amount ? Number(donor.monthly_sanda_amount).toLocaleString() : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6 shadow-card">
                <CardHeader>
                  <CardTitle>Select Year</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {selectedYear && (
                <>
                  <Card className="mb-6 shadow-card">
                    <CardHeader className="bg-gradient-to-r from-green-500/10 to-green-500/5">
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Paid Months ({selectedYear})
                      </CardTitle>
                      <CardDescription>
                        {paidMonths.length} month(s) paid
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {paidMonths.length === 0 ? (
                        <p className="text-center text-muted-foreground">No payments recorded for this year</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {paidMonths.map(month => (
                            <div
                              key={month}
                              className="rounded-lg border border-green-200 bg-green-50 p-3 text-center dark:border-green-900 dark:bg-green-950"
                            >
                              <p className="font-medium text-green-700 dark:text-green-300">
                                {monthNames[month - 1]}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-card">
                    <CardHeader className="bg-gradient-to-r from-red-500/10 to-red-500/5">
                      <CardTitle className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        Unpaid Months ({selectedYear})
                      </CardTitle>
                      <CardDescription>
                        {unpaidMonths.length} month(s) unpaid
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {unpaidMonths.length === 0 ? (
                        <p className="text-center text-green-600">All months paid!</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {unpaidMonths.map(month => (
                            <div
                              key={month}
                              className="rounded-lg border border-red-200 bg-red-50 p-3 text-center dark:border-red-900 dark:bg-red-950"
                            >
                              <p className="font-medium text-red-700 dark:text-red-300">
                                {monthNames[month - 1]}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
