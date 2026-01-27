-- Create families table for Data Collection module
CREATE TABLE public.families (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  root_no TEXT,
  total_members INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for families
CREATE POLICY "Admins can view all families" 
ON public.families 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert families" 
ON public.families 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update families" 
ON public.families 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete families" 
ON public.families 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create family_members table
CREATE TABLE public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  relationship TEXT,
  occupation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for family_members
CREATE POLICY "Admins can view all family members" 
ON public.family_members 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert family members" 
ON public.family_members 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update family members" 
ON public.family_members 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete family members" 
ON public.family_members 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create zakat_transactions table for Baithul Zakat module
CREATE TABLE public.zakat_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('collection', 'distribution')),
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  donor_name TEXT,
  recipient_name TEXT,
  purpose TEXT,
  method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.zakat_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for zakat_transactions
CREATE POLICY "Admins can view all zakat transactions" 
ON public.zakat_transactions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert zakat transactions" 
ON public.zakat_transactions 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update zakat transactions" 
ON public.zakat_transactions 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete zakat transactions" 
ON public.zakat_transactions 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));