-- Add WhatsApp number and status to donors table
ALTER TABLE public.donors 
ADD COLUMN IF NOT EXISTS whatsapp_no text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Create reminder_logs table to track sent messages
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid REFERENCES public.donors(id) ON DELETE CASCADE NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  sent_at timestamp with time zone DEFAULT now() NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  message text,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create settings table for API credentials and configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on reminder_logs
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for reminder_logs
CREATE POLICY "Admins can view all reminder logs"
ON public.reminder_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert reminder logs"
ON public.reminder_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_settings
CREATE POLICY "Admins can view all settings"
ON public.app_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert settings"
ON public.app_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings"
ON public.app_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_reminder_logs_donor_month_year ON public.reminder_logs(donor_id, month, year);
CREATE INDEX IF NOT EXISTS idx_donors_status ON public.donors(status);