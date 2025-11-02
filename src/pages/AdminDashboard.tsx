import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, DollarSign, TrendingUp, LogOut, Bell } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [stats, setStats] = useState({
    totalDonors: 0,
    totalDonations: 0,
    monthlyTotal: 0,
  });
  const [recentDonations, setRecentDonations] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadRecentDonations();
  }, []);

  const loadStats = async () => {
    try {
      // Get total donors
      const { count: donorsCount } = await supabase
        .from("donors")
        .select("*", { count: "exact", head: true });

      // Get total donations count
      const { count: donationsCount } = await supabase
        .from("donations")
        .select("*", { count: "exact", head: true });

      // Get this month's total
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyData } = await supabase
        .from("donations")
        .select("amount")
        .gte("date", firstDayOfMonth.toISOString());

      const monthlyTotal = monthlyData?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

      setStats({
        totalDonors: donorsCount || 0,
        totalDonations: donationsCount || 0,
        monthlyTotal,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadRecentDonations = async () => {
    try {
      const { data } = await supabase
        .from("donations")
        .select(`
          *,
          donors (
            name,
            card_number
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentDonations(data || []);
    } catch (error) {
      console.error("Error loading recent donations:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Donors</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDonors}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDonations}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs. {stats.monthlyTotal.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <Link to="/admin/donors">
            <Card className="cursor-pointer shadow-card transition-all hover:shadow-elegant">
              <CardHeader>
                <CardTitle>Manage Donors</CardTitle>
                <CardDescription>Add, edit, and view donor information</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/admin/donations">
            <Card className="cursor-pointer shadow-card transition-all hover:shadow-elegant">
              <CardHeader>
                <CardTitle>Manage Donations</CardTitle>
                <CardDescription>Record and track all donations</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/admin/reminder-logs">
            <Card className="cursor-pointer shadow-card transition-all hover:shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Reminder Logs
                </CardTitle>
                <CardDescription>View WhatsApp reminder history</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Recent Donations</CardTitle>
            <CardDescription>Latest 5 donation records</CardDescription>
          </CardHeader>
          <CardContent>
            {recentDonations.length === 0 ? (
              <p className="text-center text-muted-foreground">No donations yet</p>
            ) : (
              <div className="space-y-3">
                {recentDonations.map((donation) => (
                  <div
                    key={donation.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">{donation.donors?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {donation.donors?.card_number} • {new Date(donation.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">Rs. {Number(donation.amount).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{donation.method}</p>
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
