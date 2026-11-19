/**
 * 구조화 데이터(JSON-LD)를 페이지에 넣는다. 검색엔진과 AI 검색이 화면 글자 대신 이 값을 읽는다.
 * 관리자가 넣은 문구(상품명·FAQ)가 섞이므로 "<" 를 바꿔 적어서 </script> 로 빠져나가지 못하게 한다
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
