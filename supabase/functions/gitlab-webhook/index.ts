// GitLab Webhook Handler for Pipeline Events
// Supabase Edge Function

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-gitlab-token, x-gitlab-event",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GitLabPipelineEvent {
  object_kind: string;
  object_attributes: {
    id: number;
    ref: string;
    status: string;
    created_at: string;
    finished_at: string | null;
    duration: number | null;
    stages: string[];
    sha: string;
  };
  user: {
    name: string;
    username: string;
    email: string;
  };
  project: {
    id: number;
    name: string;
    web_url: string;
  };
  commit: {
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get webhook secret from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const webhookSecret = pathParts[pathParts.length - 1];

    if (!webhookSecret || webhookSecret === "gitlab-webhook") {
      return new Response(
        JSON.stringify({ error: "Webhook secret required in URL" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify GitLab token header (optional additional security)
    const gitlabToken = req.headers.get("x-gitlab-token");
    const gitlabEvent = req.headers.get("x-gitlab-event");

    // Only process pipeline events
    if (gitlabEvent !== "Pipeline Hook") {
      return new Response(
        JSON.stringify({ message: "Event type ignored", event: gitlabEvent }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const payload: GitLabPipelineEvent = await req.json();

    // Validate payload
    if (payload.object_kind !== "pipeline") {
      return new Response(
        JSON.stringify({ message: "Not a pipeline event" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find project by webhook_secret
    const { data: project, error: projectError } = await supabase
      .from("deployment_projects")
      .select("id, gitlab_project_id")
      .eq("webhook_secret", webhookSecret)
      .single();

    if (projectError || !project) {
      console.error("Project not found for webhook secret:", webhookSecret);
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify GitLab project ID matches
    if (
      project.gitlab_project_id &&
      String(payload.project.id) !== project.gitlab_project_id
    ) {
      console.error(
        "Project ID mismatch:",
        payload.project.id,
        "vs",
        project.gitlab_project_id
      );
      return new Response(
        JSON.stringify({ error: "Project ID mismatch" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare pipeline event data
    const pipelineEvent = {
      project_id: project.id,
      pipeline_id: String(payload.object_attributes.id),
      ref: payload.object_attributes.ref,
      status: payload.object_attributes.status,
      commit_sha: payload.object_attributes.sha || payload.commit?.id,
      commit_message: payload.commit?.message?.substring(0, 500),
      author_name: payload.user?.name || payload.commit?.author?.name,
      started_at: payload.object_attributes.created_at,
      finished_at: payload.object_attributes.finished_at,
      duration_seconds: payload.object_attributes.duration,
      stages: payload.object_attributes.stages,
    };

    // Upsert pipeline event (update if exists, insert if not)
    const { error: insertError } = await supabase
      .from("pipeline_events")
      .upsert(pipelineEvent, {
        onConflict: "project_id,pipeline_id",
      });

    if (insertError) {
      console.error("Error inserting pipeline event:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save event", details: insertError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `Pipeline event saved: ${payload.object_attributes.id} - ${payload.object_attributes.status}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        pipeline_id: payload.object_attributes.id,
        status: payload.object_attributes.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
