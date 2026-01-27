import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Family {
  id: string;
  family_name: string;
  address: string | null;
  phone: string | null;
  root_no: string | null;
  total_members: number;
  notes: string | null;
  created_at: string;
}

interface FamilyMember {
  id: string;
  family_id: string;
  name: string;
  age: number | null;
  gender: string | null;
  relationship: string | null;
  occupation: string | null;
  created_at: string;
}

export function DataCollection() {
  const { toast } = useToast();
  const [families, setFamilies] = useState<Family[]>([]);
  const [members, setMembers] = useState<Record<string, FamilyMember[]>>({});
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);

  const [familyFormData, setFamilyFormData] = useState({
    family_name: "",
    address: "",
    phone: "",
    root_no: "",
    notes: "",
  });

  const [memberFormData, setMemberFormData] = useState({
    name: "",
    age: "",
    gender: "",
    relationship: "",
    occupation: "",
  });

  useEffect(() => {
    loadFamilies();
  }, []);

  const loadFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from("families")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFamilies(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const loadMembers = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from("family_members")
        .select("*")
        .eq("family_id", familyId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMembers((prev) => ({ ...prev, [familyId]: data || [] }));
    } catch (error: any) {
      console.error("Error loading members:", error);
    }
  };

  const handleToggleFamily = async (familyId: string) => {
    if (expandedFamily === familyId) {
      setExpandedFamily(null);
    } else {
      setExpandedFamily(familyId);
      if (!members[familyId]) {
        await loadMembers(familyId);
      }
    }
  };

  const handleFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFamily) {
        const { error } = await supabase
          .from("families")
          .update(familyFormData)
          .eq("id", editingFamily.id);
        if (error) throw error;
        toast({ title: "Success", description: "Family updated successfully" });
      } else {
        const { error } = await supabase.from("families").insert([familyFormData]);
        if (error) throw error;
        toast({ title: "Success", description: "Family added successfully" });
      }
      setFamilyDialogOpen(false);
      resetFamilyForm();
      loadFamilies();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditFamily = (family: Family) => {
    setEditingFamily(family);
    setFamilyFormData({
      family_name: family.family_name,
      address: family.address || "",
      phone: family.phone || "",
      root_no: family.root_no || "",
      notes: family.notes || "",
    });
    setFamilyDialogOpen(true);
  };

  const handleDeleteFamily = async (id: string) => {
    if (!confirm("Are you sure? This will also delete all family members.")) return;
    try {
      const { error } = await supabase.from("families").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Family deleted successfully" });
      loadFamilies();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetFamilyForm = () => {
    setFamilyFormData({ family_name: "", address: "", phone: "", root_no: "", notes: "" });
    setEditingFamily(null);
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamilyId) return;
    try {
      const submitData = {
        ...memberFormData,
        family_id: selectedFamilyId,
        age: memberFormData.age ? parseInt(memberFormData.age) : null,
      };
      
      if (editingMember) {
        const { error } = await supabase
          .from("family_members")
          .update(submitData)
          .eq("id", editingMember.id);
        if (error) throw error;
        toast({ title: "Success", description: "Member updated successfully" });
      } else {
        const { error } = await supabase.from("family_members").insert([submitData]);
        if (error) throw error;
        
        // Update family total_members count
        const family = families.find(f => f.id === selectedFamilyId);
        if (family) {
          await supabase
            .from("families")
            .update({ total_members: (family.total_members || 0) + 1 })
            .eq("id", selectedFamilyId);
        }
        
        toast({ title: "Success", description: "Member added successfully" });
      }
      setMemberDialogOpen(false);
      resetMemberForm();
      loadMembers(selectedFamilyId);
      loadFamilies();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditMember = (member: FamilyMember) => {
    setEditingMember(member);
    setSelectedFamilyId(member.family_id);
    setMemberFormData({
      name: member.name,
      age: member.age?.toString() || "",
      gender: member.gender || "",
      relationship: member.relationship || "",
      occupation: member.occupation || "",
    });
    setMemberDialogOpen(true);
  };

  const handleDeleteMember = async (member: FamilyMember) => {
    if (!confirm("Are you sure you want to delete this member?")) return;
    try {
      const { error } = await supabase.from("family_members").delete().eq("id", member.id);
      if (error) throw error;
      
      // Update family total_members count
      const family = families.find(f => f.id === member.family_id);
      if (family && family.total_members > 0) {
        await supabase
          .from("families")
          .update({ total_members: family.total_members - 1 })
          .eq("id", member.family_id);
      }
      
      toast({ title: "Success", description: "Member deleted successfully" });
      loadMembers(member.family_id);
      loadFamilies();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetMemberForm = () => {
    setMemberFormData({ name: "", age: "", gender: "", relationship: "", occupation: "" });
    setEditingMember(null);
    setSelectedFamilyId(null);
  };

  const openAddMemberDialog = (familyId: string) => {
    setSelectedFamilyId(familyId);
    setMemberDialogOpen(true);
  };

  const filteredFamilies = families.filter(
    (f) =>
      f.family_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.root_no && f.root_no.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Data Collection</h2>
        <Dialog open={familyDialogOpen} onOpenChange={(open) => { setFamilyDialogOpen(open); if (!open) resetFamilyForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Family</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFamily ? "Edit Family" : "Add New Family"}</DialogTitle>
              <DialogDescription>Enter family information below</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFamilySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="family_name">Head of Family Name *</Label>
                <Input
                  id="family_name"
                  value={familyFormData.family_name}
                  onChange={(e) => setFamilyFormData({ ...familyFormData, family_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="root_no">Root No.</Label>
                <SearchableSelect
                  options={["Root-1", "Root-2", "Root-3", "Root-4", "Root-5", "Root-6"].map((r) => ({ value: r, label: r }))}
                  value={familyFormData.root_no}
                  onValueChange={(v) => setFamilyFormData({ ...familyFormData, root_no: v })}
                  placeholder="Select Root No."
                  searchPlaceholder="Search root..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={familyFormData.address}
                  onChange={(e) => setFamilyFormData({ ...familyFormData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={familyFormData.phone}
                  onChange={(e) => setFamilyFormData({ ...familyFormData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={familyFormData.notes}
                  onChange={(e) => setFamilyFormData({ ...familyFormData, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingFamily ? "Update Family" : "Add Family"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={(open) => { setMemberDialogOpen(open); if (!open) resetMemberForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit Member" : "Add Family Member"}</DialogTitle>
            <DialogDescription>Enter member information below</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMemberSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member_name">Name *</Label>
              <Input
                id="member_name"
                value={memberFormData.name}
                onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={memberFormData.age}
                onChange={(e) => setMemberFormData({ ...memberFormData, age: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <SearchableSelect
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                ]}
                value={memberFormData.gender}
                onValueChange={(v) => setMemberFormData({ ...memberFormData, gender: v })}
                placeholder="Select gender"
                searchPlaceholder="Search..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <SearchableSelect
                options={[
                  { value: "Head", label: "Head" },
                  { value: "Wife", label: "Wife" },
                  { value: "Husband", label: "Husband" },
                  { value: "Son", label: "Son" },
                  { value: "Daughter", label: "Daughter" },
                  { value: "Father", label: "Father" },
                  { value: "Mother", label: "Mother" },
                  { value: "Brother", label: "Brother" },
                  { value: "Sister", label: "Sister" },
                  { value: "Other", label: "Other" },
                ]}
                value={memberFormData.relationship}
                onValueChange={(v) => setMemberFormData({ ...memberFormData, relationship: v })}
                placeholder="Select relationship"
                searchPlaceholder="Search..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={memberFormData.occupation}
                onChange={(e) => setMemberFormData({ ...memberFormData, occupation: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full">
              {editingMember ? "Update Member" : "Add Member"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="mb-4 shadow-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by family name or root number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0"
            />
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>All Families ({filteredFamilies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFamilies.length === 0 ? (
            <p className="text-center text-muted-foreground">No families found</p>
          ) : (
            <div className="space-y-3">
              {filteredFamilies.map((family) => (
                <div key={family.id} className="rounded-lg border border-border">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => handleToggleFamily(family.id)}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{family.family_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {family.root_no && `${family.root_no} • `}
                        {family.address || "No address"}
                        {family.phone && ` • ${family.phone}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {family.total_members || 0} members
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); handleEditFamily(family); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteFamily(family.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      {expandedFamily === family.id ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {expandedFamily === family.id && (
                    <div className="border-t border-border p-4 bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium">Family Members</p>
                        <Button size="sm" onClick={() => openAddMemberDialog(family.id)}>
                          <Plus className="mr-1 h-3 w-3" />Add Member
                        </Button>
                      </div>
                      {members[family.id]?.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No members added yet
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {members[family.id]?.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between rounded-md bg-background p-3 border"
                            >
                              <div>
                                <p className="font-medium text-sm">{member.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {member.relationship && `${member.relationship}`}
                                  {member.age && ` • ${member.age} yrs`}
                                  {member.gender && ` • ${member.gender}`}
                                  {member.occupation && ` • ${member.occupation}`}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditMember(member)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteMember(member)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
