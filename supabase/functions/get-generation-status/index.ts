import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Limits
const FREE_DAILY_LIMIT = 5;
const SIGNED_IN_BONUS = 3;
const TOTAL_FREE_LIMIT = FREE_DAILY_LIMIT + SIGNED_IN_BONUS;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          generationsUsed: 0, 
          generationsLimit: FREE_DAILY_LIMIT,
          hasSubscription: false,
          isSignedIn: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          generationsUsed: 0, 
          generationsLimit: FREE_DAILY_LIMIT,
          hasSubscription: false,
          isSignedIn: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user has an active subscription
    const { data: customers } = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(user.email || '')}`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
        },
      }
    ).then(r => r.json());

    let hasActiveSubscription = false;
    
    if (customers?.data?.length > 0) {
      const customerId = customers.data[0].id;
      const { data: subscriptions } = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
          },
        }
      ).then(r => r.json());
      
      hasActiveSubscription = subscriptions?.data?.length > 0;

      if (!hasActiveSubscription) {
        const { data: trialSubs } = await fetch(
          `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=trialing&limit=1`,
          {
            headers: {
              'Authorization': `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
            },
          }
        ).then(r => r.json());
        
        hasActiveSubscription = trialSubs?.data?.length > 0;
      }
    }

    if (hasActiveSubscription) {
      return new Response(
        JSON.stringify({ 
          generationsUsed: 0, 
          generationsLimit: null,
          hasSubscription: true,
          isSignedIn: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get today's generation count
    const today = new Date().toISOString().split('T')[0];
    const { data: genRecord } = await supabase
      .from('daily_generations')
      .select('count')
      .eq('user_id', user.id)
      .eq('generation_date', today)
      .single();

    const currentCount = genRecord?.count || 0;

    return new Response(
      JSON.stringify({ 
        generationsUsed: currentCount, 
        generationsLimit: TOTAL_FREE_LIMIT,
        hasSubscription: false,
        isSignedIn: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in get-generation-status:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
