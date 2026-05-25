const fetch = require('node-fetch');
async function test() {
  const url = 'http://localhost:3000/api/prices/movers';
  const res = await fetch(url);
  console.log(await res.text());
}
test();
