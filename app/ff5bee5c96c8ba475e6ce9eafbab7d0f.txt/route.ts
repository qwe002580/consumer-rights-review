const verificationContent = "286a481242509cf2b0cdbff15f0dc5c9671852ce";

export function GET() {
  return new Response(verificationContent, {
    headers: {
      "content-type": "text/plain; charset=utf-8"
    }
  });
}
