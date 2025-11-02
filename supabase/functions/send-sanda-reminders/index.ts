import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Donor {
  id: string
  name: string
  whatsapp_no: string
  monthly_sanda_amount: number
  status: string
}

interface ReminderRequest {
  donorId?: string // For manual single donor reminder
  month?: number
  year?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      throw new Error('Twilio credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get request body for manual reminders
    const body: ReminderRequest = req.method === 'POST' ? await req.json() : {}
    
    // Get current month and year or use provided values
    const now = new Date()
    const currentMonth = body.month || now.getMonth() + 1
    const currentYear = body.year || now.getFullYear()

    console.log(`Processing reminders for ${currentMonth}/${currentYear}`)

    // Fetch active donors
    let donorsQuery = supabase
      .from('donors')
      .select('id, name, whatsapp_no, monthly_sanda_amount, status')
      .eq('status', 'active')
      .not('whatsapp_no', 'is', null)

    // If specific donor requested (manual send)
    if (body.donorId) {
      donorsQuery = donorsQuery.eq('id', body.donorId)
    }

    const { data: donors, error: donorsError } = await donorsQuery

    if (donorsError) {
      console.error('Error fetching donors:', donorsError)
      throw donorsError
    }

    if (!donors || donors.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active donors found', sent: 0, failed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${donors.length} active donors`)

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // Process each donor
    for (const donor of donors as Donor[]) {
      try {
        // Check if already paid for current month
        const { data: payments } = await supabase
          .from('donations')
          .select('months_paid, year')
          .eq('donor_id', donor.id)
          .eq('year', currentYear)

        let hasPaid = false
        if (payments && payments.length > 0) {
          for (const payment of payments) {
            if (payment.months_paid && payment.months_paid.includes(currentMonth)) {
              hasPaid = true
              break
            }
          }
        }

        if (hasPaid) {
          console.log(`Skipping ${donor.name} - already paid for ${currentMonth}/${currentYear}`)
          results.skipped++
          continue
        }

        // Prepare WhatsApp message
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ]
        const monthName = monthNames[currentMonth - 1]

        const message = `அஸ்ஸலாமு அலைக்கும் ${donor.name},

இது உங்கள் ${monthName} மாத சந்தா (sanda) தொகையை வழங்க நினைவூட்டும் ஒரு நட்பு செய்தி.
தயவுசெய்து உங்களது வழக்கமான முறையில் பணம் செலுத்தவும்.

Monthly Amount: Rs. ${donor.monthly_sanda_amount}

ஜஸாகல்லாஹு கைர்!
— Masjid Donation Team`

        // Send WhatsApp message via Twilio
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
        
        const formData = new URLSearchParams()
        formData.append('From', `whatsapp:${twilioWhatsAppNumber}`)
        formData.append('To', `whatsapp:${donor.whatsapp_no}`)
        formData.append('Body', message)

        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        })

        const twilioResult = await twilioResponse.json()

        // Log the reminder
        const logStatus = twilioResponse.ok ? 'success' : 'failed'
        const errorMessage = twilioResponse.ok ? null : JSON.stringify(twilioResult)

        await supabase
          .from('reminder_logs')
          .insert({
            donor_id: donor.id,
            month: currentMonth,
            year: currentYear,
            status: logStatus,
            message: message,
            error_message: errorMessage
          })

        if (twilioResponse.ok) {
          console.log(`Successfully sent reminder to ${donor.name}`)
          results.sent++
        } else {
          console.error(`Failed to send to ${donor.name}:`, twilioResult)
          results.failed++
          results.errors.push(`${donor.name}: ${twilioResult.message || 'Unknown error'}`)
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error processing ${donor.name}:`, error)
        results.failed++
        results.errors.push(`${donor.name}: ${errorMessage}`)
        
        // Log the failed attempt
        await supabase
          .from('reminder_logs')
          .insert({
            donor_id: donor.id,
            month: currentMonth,
            year: currentYear,
            status: 'failed',
            message: '',
            error_message: errorMessage
          })
      }
    }

    console.log('Reminder sending completed:', results)

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})