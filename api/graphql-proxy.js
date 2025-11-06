export default async function onRequest(context) {
  // 改用一般 GraphQL endpoint（不是 persisted query）
  const AEM_ENDPOINT = 'https://publish-p115457-e1250159.adobeaemcloud.com/content/cq:graphql/ktliu-testing/endpoint.gql';

  // 取得前端傳來的 request body
  const body = await context.request.text();

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
