export default async function onRequest(context) {
  // 取得前端傳來的 request body
  const body = await context.request.text();

  // eslint-disable-next-line no-console
  console.log('📦 Proxy received request body:', body);

  // 嘗試多個可能的 GraphQL endpoint（按優先順序）
  const endpoints = [
    'https://publish-p115457-e1250159.adobeaemcloud.com/content/graphql/global/endpoint.json',
    'https://publish-p115457-e1250159.adobeaemcloud.com/content/_cq_graphql/global/endpoint.json',
    'https://publish-p115457-e1250159.adobeaemcloud.com/content/_cq_graphql/ktliu-testing/endpoint.json',
    'https://publish-p115457-e1250159.adobeaemcloud.com/graphql/endpoint.json',
  ];

  let lastError = null;

  // 逐一嘗試每個 endpoint
  for (let i = 0; i < endpoints.length; i += 1) {
    const AEM_ENDPOINT = endpoints[i];
    // eslint-disable-next-line no-console
    console.log(`🔄 [${i + 1}/${endpoints.length}] Trying endpoint:`, AEM_ENDPOINT);

    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(AEM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body,
      });

      // eslint-disable-next-line no-console
      console.log(`  ↪️ Status: ${response.status}`);

      if (response.ok) {
        // eslint-disable-next-line no-await-in-loop
        const data = await response.json();
        // eslint-disable-next-line no-console
        console.log('  ✅ Success! Returning data');

        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      // 如果不是 200，記錄錯誤但繼續嘗試下一個
      // eslint-disable-next-line no-await-in-loop
      const errorText = await response.text();
      lastError = `HTTP ${response.status}: ${errorText}`;
      // eslint-disable-next-line no-console
      console.log('  ⚠️ Failed:', lastError);
    } catch (error) {
      lastError = error.message;
      // eslint-disable-next-line no-console
      console.log('  ⚠️ Error:', error.message);
    }
  }

  // 所有 endpoint 都失敗
  // eslint-disable-next-line no-console
  console.error('❌ All endpoints failed. Last error:', lastError);

  return new Response(JSON.stringify({
    error: true,
    message: `All GraphQL endpoints failed. Last error: ${lastError}`,
    attempted: endpoints,
  }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
