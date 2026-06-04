import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBloggerPost } from '@/lib/services/blogger-api';

export async function GET(request: NextRequest) {
  try {
    console.log('[v0] BLOGGER TEST: Starting Blogger API test...');
    
    const supabase = await createClient();

    // Check credentials in system_config
    console.log('[v0] BLOGGER TEST: Checking system configuration...');
    
    const { data: configs, error: configError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', ['blogger_blog_id', 'blogger_api_key']);

    if (configError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch config',
        details: configError.message,
      }, { status: 500 });
    }

    const configMap = configs?.reduce((acc: Record<string, string>, cfg) => {
      acc[cfg.config_key] = cfg.config_value;
      return acc;
    }, {}) || {};

    console.log('[v0] BLOGGER TEST: Config check:');
    console.log(`  - blogger_blog_id: ${configMap.blogger_blog_id ? '✓ SET' : '✗ MISSING'}`);
    console.log(`  - blogger_api_key: ${configMap.blogger_api_key ? '✓ SET (length: ' + configMap.blogger_api_key.length + ')' : '✗ MISSING'}`);

    if (!configMap.blogger_blog_id || !configMap.blogger_api_key) {
      return NextResponse.json({
        success: false,
        error: 'Missing Blogger credentials',
        config: {
          blogger_blog_id: configMap.blogger_blog_id ? 'SET' : 'MISSING',
          blogger_api_key: configMap.blogger_api_key ? 'SET' : 'MISSING',
        },
      }, { status: 400 });
    }

    // Create a test article
    console.log('[v0] BLOGGER TEST: Creating test article...');
    
    const testArticle = {
      title: `Test Article ${new Date().toISOString()}`,
      content: 'This is a test article created by the debug endpoint to verify Blogger API connectivity.',
      labels: ['test', 'debug'],
      isDraft: true, // Create as draft for testing
    };

    console.log('[v0] BLOGGER TEST: Calling createBloggerPost with:', testArticle);
    
    const result = await createBloggerPost(testArticle);

    console.log('[v0] BLOGGER TEST: Result:', result);

    if (!result || !result.postId) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create Blogger post',
        details: result?.error || 'Unknown error',
        request: testArticle,
      }, { status: 500 });
    }

    // Store test result in database
    const { error: insertError } = await supabase
      .from('article_history')
      .insert({
        article_id: '00000000-0000-0000-0000-000000000000', // Dummy ID for test
        action: 'blogger_test',
        status: 'success',
        details: {
          postId: result.postId,
          url: result.url,
          testArticle: testArticle.title,
        },
      });

    if (insertError) {
      console.error('[v0] BLOGGER TEST: Failed to log test result:', insertError);
    }

    return NextResponse.json({
      success: true,
      message: 'Blogger API test successful',
      credentials: {
        blogger_blog_id: configMap.blogger_blog_id,
        blogger_api_key_length: configMap.blogger_api_key.length,
      },
      testArticle,
      result: {
        postId: result.postId,
        url: result.url,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[v0] BLOGGER TEST: ERROR:', errorMsg);
    
    return NextResponse.json({
      success: false,
      error: 'Blogger test failed',
      details: errorMsg,
    }, { status: 500 });
  }
}
