import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // 같은 와이파이의 폰·다른 PC에서 개발 서버(http://<이 PC IP>:3002)를 열어 볼 때.
  // Next 16은 다른 호스트에서 오는 개발 리소스 요청을 기본으로 막아서(화면이 검게만 나옴) 허용할 주소를 적어 둔다
  allowedDevOrigins: ["192.168.45.169", "192.168.45.*", "localhost"],
  images: {
    // 기존 아임웹 CDN의 상품 사진 (자체 이미지 저장소로 옮기기 전까지)
    remotePatterns: [
      new URL("https://cdn.imweb.me/**"),
      // 관리자에서 올린 사진 (로컬 BE). 배포 때는 사진 저장소(S3) 주소를 IMAGE_HOST 환경변수로
      new URL("http://localhost:8080/files/**"),
      new URL("http://localhost:8090/files/**"),
      ...(process.env.IMAGE_HOST ? [new URL(`${process.env.IMAGE_HOST}/**`)] : []),
    ],
  },
};

export default nextConfig;
