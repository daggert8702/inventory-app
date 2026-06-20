export default function middleware() {
  return new Response("Digital Den intentional outage test", {
    status: 503,
    headers: {
      "content-type": "text/plain"
    }
  });
}

export const config = {
  matcher: "/:path*"
};
