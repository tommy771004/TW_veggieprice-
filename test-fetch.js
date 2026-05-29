async function run() {
  const res = await fetch('https://data.moa.gov.tw/Service/OpenData/FromM/CropMarketRestDayData.aspx');
  const text = await res.text();
  console.log(res.status, res.headers.get('content-type'));
  console.log(text.substring(0, 300));
}
run();
