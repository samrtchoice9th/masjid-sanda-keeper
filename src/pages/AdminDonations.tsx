import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Search } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AdminDonations() {
  const [donations, setDonations] = useState<any[]>([]);
  const [donors, setDonors] = useState<any[]>([]);
  const [filteredDonorsByRoot, setFilteredDonorsByRoot] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<any>(null);
  const [selectedDonor, setSelectedDonor] = useState<any>(null);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    root_no: "",
    donor_id: "",
    year: new Date().getFullYear().toString(),
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDonors();
    loadDonations();
  }, []);

  const loadDonors = async () => {
    const { data } = await supabase
      .from("donors")
      .select("*")
      .order("name");
    setDonors(data || []);
  };

  const handleRootChange = (rootNo: string) => {
    setFormData({ ...formData, root_no: rootNo, donor_id: "" });
    setSelectedDonor(null);
    setSelectedMonths([]);
    const filtered = donors.filter((d) => d.root_no === rootNo);
    setFilteredDonorsByRoot(filtered);
  };

  const handleDonorChange = (donorId: string) => {
    setFormData({ ...formData, donor_id: donorId });
    const donor = donors.find((d) => d.id === donorId);
    setSelectedDonor(donor);
    setSelectedMonths([]);
  };

  const handleMonthToggle = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  const calculateTotal = () => {
    if (!selectedDonor?.monthly_sanda_amount) return 0;
    return selectedMonths.length * Number(selectedDonor.monthly_sanda_amount);
  };

  const loadDonations = async () => {
    try {
      const { data, error } = await supabase
        .from("donations")
        .select(`
          *,
          donors (
            name,
            card_number
          )
        `)
        .order("date", { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMonths.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one month",
        variant: "destructive",
      });
      return;
    }

    try {
      const submitData = {
        donor_id: formData.donor_id,
        amount: calculateTotal(),
        year: parseInt(formData.year),
        months_paid: selectedMonths,
        method: "sanda",
        date: new Date().toISOString().split("T")[0],
      };

      const { error } = await supabase
        .from("donations")
        .insert([submitData]);

      if (error) throw error;
      toast({ title: "Success", description: "Sanda recorded successfully" });

      setDialogOpen(false);
      resetForm();
      loadDonations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sanda payment?")) return;

    try {
      const { error } = await supabase
        .from("donations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Sanda payment deleted successfully" });
      loadDonations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      root_no: "",
      donor_id: "",
      year: new Date().getFullYear().toString(),
    });
    setSelectedDonor(null);
    setSelectedMonths([]);
    setFilteredDonorsByRoot([]);
    setEditingDonation(null);
  };

  const filteredDonations = donations.filter(
    (donation) =>
      donation.donors?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.donors?.card_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Manage Sanda</h1>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Record New Sanda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record New Sanda</DialogTitle>
                <DialogDescription>Fill in the sanda payment details below</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Select Root No. */}
                <div className="space-y-2">
                  <Label htmlFor="root_no">Step 1: Select Root No. *</Label>
                  <Select
                    value={formData.root_no}
                    onValueChange={handleRootChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Root No." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Root-1">Root-1</SelectItem>
                      <SelectItem value="Root-2">Root-2</SelectItem>
                      <SelectItem value="Root-3">Root-3</SelectItem>
                      <SelectItem value="Root-4">Root-4</SelectItem>
                      <SelectItem value="Root-5">Root-5</SelectItem>
                      <SelectItem value="Root-6">Root-6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Step 2: Select Card No. and show donor details */}
                {formData.root_no && (
                  <div className="space-y-2">
                    <Label htmlFor="donor_id">Step 2: Select Card No. *</Label>
                    <Select
                      value={formData.donor_id}
                      onValueChange={handleDonorChange}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a donor" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredDonorsByRoot.map((donor) => (
                          <SelectItem key={donor.id} value={donor.id}>
                            {donor.card_number} - {donor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedDonor && (
                      <Card className="mt-4 bg-muted/50">
                        <CardContent className="pt-4">
                          <div className="space-y-1 text-sm">
                            <p><strong>Name:</strong> {selectedDonor.name}</p>
                            <p><strong>Phone:</strong> {selectedDonor.phone || "N/A"}</p>
                            <p><strong>Monthly Sanda:</strong> Rs. {Number(selectedDonor.monthly_sanda_amount || 0).toLocaleString()}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Step 3: Select Year */}
                {selectedDonor && (
                  <div className="space-y-2">
                    <Label htmlFor="year">Step 3: Select Year *</Label>
                    <Select
                      value={formData.year}
                      onValueChange={(value) => setFormData({ ...formData, year: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027, 2028].map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Step 4: Select Months */}
                {formData.year && selectedDonor && (
                  <div className="space-y-3">
                    <Label>Step 4: Select Months Paid *</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { num: 1, name: "January" },
                        { num: 2, name: "February" },
                        { num: 3, name: "March" },
                        { num: 4, name: "April" },
                        { num: 5, name: "May" },
                        { num: 6, name: "June" },
                        { num: 7, name: "July" },
                        { num: 8, name: "August" },
                        { num: 9, name: "September" },
                        { num: 10, name: "October" },
                        { num: 11, name: "November" },
                        { num: 12, name: "December" },
                      ].map((month) => (
                        <div key={month.num} className="flex items-center space-x-2">
                          <Checkbox
                            id={`month-${month.num}`}
                            checked={selectedMonths.includes(month.num)}
                            onCheckedChange={() => handleMonthToggle(month.num)}
                          />
                          <label
                            htmlFor={`month-${month.num}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {month.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 5: Show Total */}
                {selectedMonths.length > 0 && (
                  <Card className="bg-primary/10 border-primary">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {selectedMonths.length} month(s) × Rs. {Number(selectedDonor?.monthly_sanda_amount || 0).toLocaleString()}
                          </p>
                          <p className="text-2xl font-bold text-primary">
                            Total: Rs. {calculateTotal().toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 6: Save Button */}
                <Button type="submit" className="w-full" disabled={!selectedDonor || selectedMonths.length === 0}>
                  Save Sanda Payment
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-6 shadow-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by donor name or card number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 focus-visible:ring-0"
              />
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>All Sanda Payments ({filteredDonations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredDonations.length === 0 ? (
              <p className="text-center text-muted-foreground">No sanda payments found</p>
            ) : (
              <div className="space-y-3">
                {filteredDonations.map((donation) => (
                  <div
                    key={donation.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{donation.donors?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {donation.donors?.card_number} • {new Date(donation.date).toLocaleDateString()}
                        {donation.year && ` • Year: ${donation.year}`}
                        {donation.months_paid && ` • Months: ${donation.months_paid.length}`}
                      </p>
                      {donation.note && (
                        <p className="text-xs text-muted-foreground">{donation.note}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-bold text-primary">
                        Rs. {Number(donation.amount).toLocaleString()}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(donation.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
