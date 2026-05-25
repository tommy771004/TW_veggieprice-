async function test() {
  const url = 'https://data.moa.gov.tw/api/v1/AgriProductsTransType/?Start_time=115.05.20&End_time=115.05.20&$top=1&$skip=1';
  const res = await fetch(url);
  const data = await res.json();
  console.log(data);
}
test();
