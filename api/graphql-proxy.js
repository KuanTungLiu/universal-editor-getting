export default async function onRequest(context) {
  // 試試看用公開的 GraphQL endpoint（不帶 cq:graphql）
  const AEM_ENDPOINT = 'https://publish-p115457-e1250159.adobeaemcloud.com/graphql/endpoint.json';

  // 如果上面不行，也可以試試這些：
  // const AEM_ENDPOINT = 'https://publish-p115457-e1250159.adobeaemcloud.com/content/graphql/global/endpoint.json';
  // const AEM_ENDPOINT = 'https://publish-p115457-e1250159.adobeaemcloud.com/content/_cq_graphql/ktliu-testing/endpoint.json';

  // 取得前端傳來的 request body
  const body = await context.request.text();

  // eslint-disable-next-line no-console
  console.log('🔄 Proxy forwarding to AEM:', AEM_ENDPOINT);
  // eslint-disable-next-line no-console
  console.log('📦 Request body:', body);

  try {
    // 轉發到 AEM
    const response = await fetch(AEM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // 如果需要認證，加在這裡
        // 'Authorization': 'Bearer YOUR_TOKEN',
      },
      body,
    });

    // 取得 AEM 的回應
    const data = await response.json();

    // 回傳給前端（加上 CORS headers）
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: true,
      message: error.message,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
