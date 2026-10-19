const test = require('node:test');
const assert = require('node:assert/strict');
const { handler } = require('../netlify/functions/advisor.js');

const originalFetch = global.fetch;
const originalKey = process.env.OPENAI_API_KEY;
const originalCode = process.env.ADVISOR_ACCESS_CODE;
test.after(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
  if (originalCode === undefined) delete process.env.ADVISOR_ACCESS_CODE;
  else process.env.ADVISOR_ACCESS_CODE = originalCode;
});
const event = (method, body) => ({httpMethod: method, body: JSON.stringify(body)});

test('rejects non-POST', async () => {
  const res = await handler(event('GET', {}));
  assert.equal(res.statusCode, 405);
});
test('fails safely without server configuration', async () => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.ADVISOR_ACCESS_CODE;
  const res = await handler(event('POST', {question:'Resumen'}));
  assert.equal(res.statusCode, 503);
});
test('rejects invalid access code without API call', async () => {
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.ADVISOR_ACCESS_CODE = 'test-secret';
  global.fetch = async () => { throw Error('should not call API'); };
  const res = await handler(event('POST', {question:'Resumen',access_code:'wrong'}));
  assert.equal(res.statusCode, 403);
});
test('returns advisor text via mocked OpenAI API', async () => {
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.ADVISOR_ACCESS_CODE = 'test-secret';
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const request = JSON.parse(options.body);
    assert.equal(request.input.at(-1).content, '¿Cuál es mi mayor posición?');
    return { ok:true, json:async () => ({output:[{content:[{type:'output_text',text:'La posición mayor es AAPL.'}]}]}) };
  };
  const res = await handler(event('POST', {question:'¿Cuál es mi mayor posición?',access_code:'test-secret',portfolio:{total:100,ordered:[{ticker:'AAPL',value:60}]}}));
  assert.equal(res.statusCode,200);
  assert.match(JSON.parse(res.body).answer,/AAPL/);
});
