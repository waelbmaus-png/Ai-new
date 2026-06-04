import { createClient } from "@/lib/supabase/server";

interface BloggerPost {
  kind: string;
  id: string;
  blog: {
    id: string;
  };
  published: string;
  updated: string;
  url: string;
  selfLink: string;
  title: string;
  content: string;
  author: {
    id: string;
    displayName: string;
    url: string;
    image: {
      url: string;
    };
  };
  labels: string[];
  draft: boolean;
}

interface CreatePostRequest {
  title: string;
  content: string;
  labels: string[];
  isDraft: boolean;
}

async function getConfig(key: string): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("system_config")
    .select("config_value")
    .eq("config_key", key)
    .single();

  if (error) {
    console.error(`[v0] Error fetching config ${key}:`, error);
    return "";
  }

  return data?.config_value || "";
}

async function getAccessToken(): Promise<string> {
  // In a real implementation, this would refresh the OAuth token using the refresh token
  // For now, we'll return the stored token
  const apiKey = await getConfig("blogger_api_key");
  console.log(`[v0] Blogger API: Retrieved access token (length: ${apiKey?.length || 0})`);
  return apiKey;
}

export async function createBloggerPost(
  post: CreatePostRequest
): Promise<{ postId: string; url: string; error?: string } | null> {
  try {
    console.log(`[v0] createBloggerPost: Starting post creation. Title: "${post.title}", isDraft: ${post.isDraft}`);
    
    const accessToken = await getAccessToken();
    const blogId = await getConfig("blogger_blog_id");

    console.log(`[v0] Blogger credentials check - BlogId: ${blogId ? "✓" : "✗"}, Token: ${accessToken ? "✓" : "✗"}`);

    if (!accessToken || !blogId) {
      const error = `Missing Blogger credentials: blogId=${!!blogId}, token=${!!accessToken}`;
      console.error(`[v0] ${error}`);
      return { postId: "", url: "", error };
    }

    // Format content with HTML
    const htmlContent = `
      <div>
        ${post.content.replace(/\n/g, "<br>")}
      </div>
    `;

    const postData = {
      kind: "blogger#post",
      blog: {
        id: blogId,
      },
      title: post.title,
      content: htmlContent,
      labels: post.labels,
      draft: post.isDraft,
    };

    console.log(`[v0] createBloggerPost: Sending POST request to Blogger API. Post title: "${post.title}"`);
    
    const response = await fetch(
      `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?access_token=${accessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      }
    );

    console.log(`[v0] createBloggerPost: Response status: ${response.status}`);

    if (!response.ok) {
      const error = await response.json();
      const errorMsg = `Blogger API error (${response.status}): ${JSON.stringify(error)}`;
      console.error(`[v0] ${errorMsg}`);
      return { postId: "", url: "", error: errorMsg };
    }

    const created = (await response.json()) as BloggerPost;
    console.log(`[v0] createBloggerPost: SUCCESS. PostId: ${created.id}, URL: ${created.url}`);

    return {
      postId: created.id,
      url: created.url,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[v0] createBloggerPost: EXCEPTION - ${errorMsg}`);
    return { postId: "", url: "", error: errorMsg };
  }
}

export async function publishBloggerPost(
  postId: string
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    const blogId = await getConfig("blogger_blog_id");

    if (!accessToken || !blogId) {
      console.error("[v0] Missing Blogger credentials");
      return false;
    }

    const response = await fetch(
      `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${postId}/publish?access_token=${accessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error(
        "[v0] Error publishing Blogger post:",
        error
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[v0] Error publishing Blogger post:", error);
    return false;
  }
}

export async function updateBloggerPost(
  postId: string,
  post: Partial<CreatePostRequest>
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    const blogId = await getConfig("blogger_blog_id");

    if (!accessToken || !blogId) {
      console.error("[v0] Missing Blogger credentials");
      return false;
    }

    const postData: Record<string, any> = {
      kind: "blogger#post",
      blog: {
        id: blogId,
      },
    };

    if (post.title) postData.title = post.title;
    if (post.content)
      postData.content = `<div>${post.content.replace(/\n/g, "<br>")}</div>`;
    if (post.labels) postData.labels = post.labels;
    if (post.isDraft !== undefined) postData.draft = post.isDraft;

    const response = await fetch(
      `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${postId}?access_token=${accessToken}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error(
        "[v0] Error updating Blogger post:",
        error
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[v0] Error updating Blogger post:", error);
    return false;
  }
}

export async function getBloggerPost(
  postId: string
): Promise<BloggerPost | null> {
  try {
    const accessToken = await getAccessToken();
    const blogId = await getConfig("blogger_blog_id");

    if (!accessToken || !blogId) {
      console.error("[v0] Missing Blogger credentials");
      return null;
    }

    const response = await fetch(
      `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${postId}?access_token=${accessToken}`
    );

    if (!response.ok) {
      console.error("[v0] Error fetching Blogger post");
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[v0] Error fetching Blogger post:", error);
    return null;
  }
}
