import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // 기존 아임웹 CDN의 상품 사진 (자체 이미지 저장소로 옮기기 전까지)
    remotePatterns: [new URL("https://cdn.imweb.me/**")],
  },
};

export default nextConfig;
