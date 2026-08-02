import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Applied to request bodies generally, not just server actions, so the
      // 1 MB default rejected every Admin image upload with a plain-text 413
      // before the route could run. Deliberately above MAX_UPLOAD_BYTES (10 MB)
      // in app/api/admin/upload/route.ts: multipart boundaries push a 10 MB
      // file just over 10 MB, and the route's own check gives a far better
      // message than a platform 413. Raise both together.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
