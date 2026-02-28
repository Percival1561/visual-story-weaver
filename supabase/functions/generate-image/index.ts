import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Limits
const FREE_DAILY_LIMIT = 10;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Supabase configuration missing");
      throw new Error("Supabase configuration missing");
    }

    // Get user from auth header (optional - anonymous users allowed)
    const authHeader = req.headers.get('Authorization');
    let user = null;

    if (authHeader) {
      const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user: authUser }, error: userError } = await supabaseUser.auth.getUser();
      
      if (!userError && authUser) {
        user = authUser;
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let hasActiveSubscription = false;

    // Only check subscription and daily limits for signed-in users
    if (user) {
      // Check if user has an active subscription
      const { data: customers } = await fetch(
        `https://api.stripe.com/v1/customers?email=${encodeURIComponent(user.email || '')}`,
        {
          headers: {
            'Authorization': `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
          },
        }
      ).then(r => r.json());

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

      console.log("User subscription status:", { userId: user.id, hasActiveSubscription });

      // If user has subscription, allow unlimited generation
      if (!hasActiveSubscription) {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: genRecord, error: genError } = await supabase
          .from('daily_generations')
          .select('count')
          .eq('user_id', user.id)
          .eq('generation_date', today)
          .single();

        const currentCount = genRecord?.count || 0;
        
        console.log("Daily generation check:", { userId: user.id, currentCount, limit: FREE_DAILY_LIMIT });

        if (currentCount >= FREE_DAILY_LIMIT) {
          return new Response(
            JSON.stringify({ 
              error: 'Daily limit reached',
              code: 'LIMIT_REACHED',
              currentCount,
              limit: FREE_DAILY_LIMIT,
              message: 'You have used all your free generations for today. Upgrade to Pro for unlimited access!'
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Increment the counter
        if (genError && genError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('daily_generations')
            .insert({
              user_id: user.id,
              generation_date: today,
              count: 1
            });
          
          if (insertError) {
            console.error("Error creating generation record:", insertError);
          }
        } else if (genRecord) {
          const { error: updateError } = await supabase
            .from('daily_generations')
            .update({ count: currentCount + 1 })
            .eq('user_id', user.id)
            .eq('generation_date', today);
          
          if (updateError) {
            console.error("Error updating generation record:", updateError);
          }
        }
      }
    }
    // Anonymous users: no server-side tracking, frontend handles via localStorage

    console.log("Generating image for user:", user?.id || 'anonymous', "prompt:", prompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Create a beautiful, artistic image based on this description: ${prompt}. Make it visually stunning and creative.`
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate image" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("Image generation response structure:", JSON.stringify(data).substring(0, 500));
    
    // Try multiple possible response paths for the image
    const message = data.choices?.[0]?.message;
    const base64ImageUrl = 
      message?.images?.[0]?.image_url?.url ||
      message?.images?.[0]?.url ||
      message?.image?.url ||
      (message?.content && typeof message.content === 'object' && message.content?.[0]?.image_url?.url) ||
      null;
    
    // Also check inline_data format from Gemini
    let imageData = base64ImageUrl;
    if (!imageData) {
      // Check for parts-based response (Gemini style)
      const parts = message?.content;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part?.type === 'image_url' && part?.image_url?.url) {
            imageData = part.image_url.url;
            break;
          }
          if (part?.inline_data?.data) {
            imageData = `data:${part.inline_data.mime_type || 'image/png'};base64,${part.inline_data.data}`;
            break;
          }
        }
      }
    }
    
    const textResponse = typeof message?.content === 'string' ? message.content : "";

    if (!imageData) {
      console.error("No image in response. Full response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "No image was generated" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract base64 data and convert to binary
    const base64Data = base64ImageUrl.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Generate unique filename
    const userId = user?.id || 'anonymous';
    const filename = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('generated-images')
      .upload(filename, binaryData, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error("Failed to save image");
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('generated-images')
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    // Save to gallery table only for signed-in users
    if (user) {
      const { error: dbError } = await supabase
        .from('gallery')
        .insert({
          image_url: publicUrl,
          prompt: prompt,
          user_id: user.id
        });

      if (dbError) {
        console.error("Database insert error:", dbError);
      }
    }

    // Get updated generation count for signed-in users
    let generationsUsed = 1;
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      const { data: updatedGen } = await supabase
        .from('daily_generations')
        .select('count')
        .eq('user_id', user.id)
        .eq('generation_date', today)
        .single();
      generationsUsed = updatedGen?.count || 1;
    }

    console.log("Image generated for:", userId);

    return new Response(
      JSON.stringify({ 
        imageUrl: publicUrl,
        description: textResponse,
        generationsUsed,
        generationsLimit: hasActiveSubscription ? null : FREE_DAILY_LIMIT,
        hasSubscription: hasActiveSubscription
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
